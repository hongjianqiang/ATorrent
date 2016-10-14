'use strict';

let VERSION, BUILD, app, client, dbg, debug, er, opts, rtcConfig, trackers;

VERSION 	= 	'0.2.0';
BUILD   	= 	'2';

rtcConfig = {
	'iceServers': [
		{ 'url': 'stun:23.21.150.121', 'urls': 'stun:23.21.150.121' }
	]
};

trackers	=	[
	'wss://tracker.btorrent.xyz',
	'wss://tracker.openwebtorrent.com',
	'wss://tracker.fastcast.nz'
];

opts = {
	announce: trackers
}

debug = window.localStorage.getItem('ATorrentDebug') != null;

dbg = function (string, item, color) {
	color = color != null ? color : '#333333';
	if (debug) {
		if ((item != null) && item.name) {
			return console.debug(`%cαTorrent:${item.infoHash != null ? 'torrent ' : 'torrent ' + item._torrent.name + ':file '}${item.name}${item.infoHash != null ? ' (' + item.infoHash + ')' : ''} %c${string}`, 'color: #33C3F0', `color: ${color}`);
		} else {
			return console.debug(`%cαTorrent:client %c${string}`, 'color: #33C3F0', `color: ${color}`);
		}
	}
};

er = function (err, item) { dbg(err, item, '#FF0000') };

dbg(`Starting... v${VERSION}b${BUILD}`);

client = new WebTorrent({
	tracker: {
		rtcConfig: rtcConfig,
		announce: trackers
	}
});

app = angular.module('ATorrent', ['ngRoute', 'ui.grid', 'ui.grid.resizeColumns', 'ui.grid.selection', 'ngFileUpload', 'ngNotify']);

app.config(['$routeProvider', function($routeProvider){
	$routeProvider
		.when('/full', {
			templateUrl: 'views/full.html',
			controller: 'FullCtrl'
		})
		.when('/download',{
			templateUrl: 'views/download.html',
			controller: 'DownloadCtrl'
		})
		.when('/view', {
			templateUrl: 'views/view.html',
			controller: 'ViewCtrl'
		})		
		.otherwise({
			redirectTo: '/full'
		});
}]);

app.controller('ATorrentCtrl', ['$scope', '$rootScope', '$http', '$log', '$location', 'ngNotify', 
						function($scope,   $rootScope,   $http,   $log,   $location,   ngNotify){
	let updateAll;

	ngNotify.config({
		duration: 5000,
		html: true
	});

	if (WebTorrent.WEBRTC_SUPPORT == null) {
		$rootScope.disabled = true;
		ngNotify.set('请使用最新的 Chrome, Firefox 或者 Opera 浏览器', {
			type: 'error',
			sticky: true,
			button: false
		});
	}

	$rootScope.version = VERSION;
	$rootScope.client  = client;

	updateAll = function (){
		if ($rootScope.client.processing) {
			return;
		}
		$rootScope.$apply()
	};
	setInterval(updateAll, 200);
	
	$rootScope.seedFiles = function (files) {
		let name;
		if ((files != null) && files.length > 0) {
			if (files.length === 1) {
				dbg(`Seeding file ${files[0].name}`);
			} else {
				dbg(`Seeding ${files.length} files`);
				name = prompt('请输入Torrent文件名', '我的Torrent文件') || '我的Torrent文件';
				opts.name = name;
			}

			$rootScope.client.processing = true;
			$rootScope.client.seed(files, opts, $rootScope.onSeed);
			delete opts.name;
		}
	};

	$rootScope.openTorrentFile = function (file) {
		if (file != null) {
			dbg(`Adding torrent file ${file.name}`);
			$rootScope.client.processing = true;
			$rootScope.client.add(file, opts, $rootScope.onTorrent);
		}
	};

	$rootScope.client.on('error', function (err, torrent) {
		$rootScope.client.processing = false;
		ngNotify.set(err, 'error');
		er(err, torrent);
	});

	$rootScope.addMagnet = function (magnet, onTorrent) {
		if ((magnet != null) && magnet.length > 0) {
			dbg(`Adding magnet/hash ${magnet}`);
			$rootScope.client.processing = true;
			$rootScope.client.add(magnet, opts, onTorrent || $rootScope.onTorrent)
		}
	};

	$rootScope.destroyedTorrent = function (err) {
		if (err) {
			throw err;
		}
		dbg('Destroyed torrent', $rootScope.selectedTorrent);
		$rootScope.selectedTorrent = null;
		$rootScope.client.processing = false;
	};

	$rootScope.changePriority = function (file) {
		if (file.priority === '-1') {
			dbg('Deselected', file);
			file.deselect();
		} else {
			dbg(`Selected with priority ${file.priority}`, file);
			file.select(file.priority);
		}
	};

	$rootScope.onTorrent = function (torrent, isSeed) {
		dbg(torrent.magnetURI);
		torrent.safeTorrentFileURL = torrent.torrentFileBlobURL;
		torrent.fileName = `${torrent.name}.torrent`;

		if (!isSeed) {
			dbg('Received metadata', torrent);
			ngNotify.set(`Received ${torrent.name} metadata`);
			
			if (!($rootScope.selectedTorrent != null)) {
				$rootScope.selectedTorrent = torrent;
			}
			
			$rootScope.client.processing = false
		}

		torrent.files.forEach(function (file) {
			file.getBlobURL(function (err, url) {
				if (err) {
					throw err;
				}
				if (isSeed) {
					dbg('Started seeding', torrent);
					if (!($rootScope.selectedTorrent != null)) {
						$rootScope.selectedTorrent = torrent
					}
					$rootScope.client.processing = false
				}
				file.url = url;
				if (!isSeed) {
					dbg('Done ', file);
					ngNotify.set(`<b>${file.name}</b> 准备下载`, 'success');
				}
			});
		});

		torrent.on('done', function () {
			if (!isSeed) {
				dbg('Done', torrent);
			}
			ngNotify.set(`<b>${torrent.name}</b> 已经下载完了`, 'success');
		});

		torrent.on('wire', function (wire, addr) { dbg(`Wire ${addr}`, torrent) });
		torrent.on('error', er);
	}

	$rootScope.onSeed = function (torrent) { $rootScope.onTorrent(torrent, true) };
	dbg('Ready');

}]);

app.controller('FullCtrl', ['$scope', '$rootScope', '$http', '$log', '$location', 'ngNotify', 
					function($scope,   $rootScope,   $http,   $log,   $location,   ngNotify){
	ngNotify.config({
		duration: 5000,
		html: true
	});

	$scope.addMagnet = function () {
		$rootScope.addMagnet($scope.torrentInput);
		$scope.torrentInput = '';
	};

	$scope.columns = [
	{
		field: 'name',
		displayName: '文件名',
		cellTooltip: true,
		minWidth: '200'
	}, {
		field: 'length',
		name: 'Size',
		displayName: '大小',
		cellFilter: 'pbytes',
		width: '80'
	}, {
		field: 'received',
		displayName: '已下载',
		cellFilter: 'pbytes',
		width: '135'
	}, {
		field: 'downloadSpeed',
		displayName: '↓ 速度',
		cellFilter: 'pbytes:1',
		width: '100'
	}, {
		field: 'progress',
		displayName: '进度',
		cellFilter: 'progress',
		width: '100'
	}, {
		field: 'timeRemaining',
		displayName: '用时',
		cellFilter: 'humanTime',
		width: '140'
	}, {
		field: 'uploaded',
		displayName: '已上传',
		cellFilter: 'pbytes',
		width: '125'
	}, {
		field: 'uploadSpeed',
		displayName: '↑ 速度',
		cellFilter: 'pbytes:1',
		width: '100'
	}, {
		field: 'numPeers',
		displayName: '节点',
		width: '80'
	}, {
		field: 'ratio',
		displayName: '比率',
		cellFilter: 'number:2',
		width: '80'
	}];

	$scope.gridOptions = {
		columnDefs: $scope.columns,
		data: $rootScope.client.torrents,
		enableColumnResizing: true,
		enableColumnMenus: false,
		enableRowSelection: true,
		enableRowHeaderSelection: false,
		multiSelect: false
	};

	$scope.gridOptions.onRegisterApi = function (gridApi) {
		$scope.gridApi = gridApi;
		gridApi.selection.on.rowSelectionChanged($scope, function (row) {
			if (!row.isSelected && ($rootScope.selectedTorrent != null) && ($rootScope.selectedTorrent.infoHash = row.entity.infoHash)) {
				$rootScope.selectedTorrent = null;
			} else {
				$rootScope.selectedTorrent = row.entity;
			}
		});
	};

	if ($location.hash() !== '') {
		$rootScope.client.processing = true;
		setTimeout(function () {
			dbg(`Adding ${$location.hash()}`);
			$rootScope.addMagnet($location.hash());
		}, 0);
	}
}]);

app.controller('DownloadCtrl', ['$scope', '$rootScope', '$http', '$log', '$location', 'ngNotify', 
						function($scope,   $rootScope,   $http,   $log,   $location,   ngNotify){
	ngNotify.config({
		duration: 5000,
		html: true
	});

	$scope.addMagnet = function(){
		$rootScope.addMagnet($scope.torrentInput);
		$scope.torrentInput = '';
	}

	if ($location.hash() !== '') {
		$rootScope.client.processing = true;
		setTimeout(function () {
			dbg(`Adding ${$location.hash()}`);
			$rootScope.addMagnet($location.hash());
		}, 0);
	}
}]);

app.controller('ViewCtrl', ['$scope', '$rootScope', '$http', '$log', '$location', 'ngNotify', 
					function($scope,   $rootScope,   $http,   $log,   $location,   ngNotify){
	let onTorrent;
	
	ngNotify.config({
		duration: 2000,
		html: true
	});

	onTorrent = function (torrent) {
		$rootScope.viewerStyle = {
			'margin-top': '-20px',
			'text-align': 'center'
		};

		dbg(torrent.magnetURI);
		torrent.safeTorrentFileURL = torrent.torrentFileBlobURL;
		torrent.fileName = `${torrent.name}.torrent`;
		$rootScope.selectedTorrent = torrent;
		$rootScope.client.processing = false;
		dbg('Received metadata', torrent);
		ngNotify.set(`Received ${torrent.name} metadata`);

		torrent.files.forEach(function (file) {
			file.appendTo('#viewer');
			file.getBlobURL(function (err, url) {
				if (err) {
					throw err;
				}
				file.url = url;
				dbg('Done ', file);
			});
		});

		torrent.on('done', dbg('Done', torrent));
		torrent.on('wire', function (wire, addr) { dbg(`Wire ${addr}`, torrent) });
		torrent.on('error', er);

		$scope.addMagnet = function () {
			$rootScope.addMagnet($scope.torrentInput, onTorrent);
			$scope.torrentInput = '';
		};

		if ($location.hash() !== '') {
			$rootScope.client.processing = true;
			setTimeout(function () {
				dbg(`Adding ${$location.hash()}`);
				$rootScope.addMagnet($location.hash(), onTorrent);
			}, 0);
		}
	}
}]);

app.filter('html', ['$sce', function($sce){
	return function(input){
		$sce.trustAsHtml(input);
	};
}]);

app.filter('pbytes', function(){
	return function(num, speed){
		let exponent, unit, units;
		
		if (isNaN(num)) {
			return '';
		}
		units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'DB', 'NB'];
		if (num < 1) {
			return (speed ? '' : '0 B')
		}
		exponent = Math.min(Math.floor(Math.log(num) / 6.907755278982137), 8);
		num = (num / Math.pow(1000, exponent)).toFixed(1) * 1;
		unit = units[exponent];
		return `${num} ${unit}${speed ? '/s' : ''}`;
	};
});

app.filter('humanTime', function(){
	return function(millis){
		let remaining;
		
		if (millis < 1000) {
			return '';
		}
		remaining = moment.duration(millis).humanize();
		return remaining[0].toUpperCase() + remaining.substr(1);
	};
});

app.filter('progress', function() { return function (num) { `${(100 * num).toFixed(1)}%` } });