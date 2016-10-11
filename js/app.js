'use strict';

let VERSION, BUILD, app, client, dbg, debug, er, opts, rtcConfig, trackers;

VERSION 	= 	'0.1.0';
BUILD   	= 	'2';

rtcConfig	=	{
	'iceServices': [
		{
			'url': 'stun:23.21.150.121',
			'urls': 'stun:23.21.150.121'
		}
	]
};
trackers	=	[
	'wss://tracker.btorrent.xyz',
	'wss://tracker.openwebtorrent.com',
	'wss://tracker.fastcast.nz'
];
opts =	{
	announce: trackers
};

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

app = angular.module('ATorrent', ['ngRoute', 'ngNotify']);

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
}]);

app.controller('FullCtrl', ['$scope', '$rootScope', '$http', '$log', '$location', 'ngNotify', 
					function($scope,   $rootScope,   $http,   $log,   $location,   ngNotify){

}]);

app.controller('DownloadCtrl', ['$scope', '$rootScope', '$http', '$log', '$location', 'ngNotify', 
						function($scope,   $rootScope,   $http,   $log,   $location,   ngNotify){

}]);

app.controller('ViewCtrl', ['$scope', '$rootScope', '$http', '$log', '$location', 'ngNotify', 
					function($scope,   $rootScope,   $http,   $log,   $location,   ngNotify){

}]);

app.filter('pbytes', function(){
	return function(num, speed){
		let exponent, unit, units;
		
		if (isNan(num)) {
			return '';
		}
		unit = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'DB', 'NB'];
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