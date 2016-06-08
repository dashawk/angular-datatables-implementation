(function () {
	'use strict';

	angular
		.module('myApp', ['datatables', 'ui.router', 'ngResource'])
		.constant('apiUrl', 'http://api.randomuser.me')
		.constant('apiResource', {
			female: '?gender=female@ID',
			male: '?gender=male@ID'
		})
		.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
			$urlRouterProvider.otherwise('/');

			$stateProvider.state('home', {
				url: '/',
				templateUrl: 'table.html',
				controller: 'mainController',
				controllerAs: 'vm'
			});
		}])

		/**
		 * DataTable Wrapper
		 */
		.service('table', ['$q', '$filter', 'DTOptionsBuilder', '$resource', 'apiUrl', 'apiResource', function ($q, $filter, DTOptionsBuilder, $resource, apiUrl, apiResource) {
			function isNull(data) {
				return data === null;
			}
			function isArray(data) {
				return (isDefined(data) && !isNull(data)) && data.constructor === Array;
			}
			function isEmpty(data){
				for(var i in data) {
					if(data.hasOwnProperty(i)) {
						return false;
					}
				}
				return !(data >= 1);
			}
			function isUndefined(data) {
				return typeof data === 'undefined';
			}
			function isDefined(data) {
				return typeof data !== 'undefined';
			}
			function url(url, ids) {
				if(isDefined(ids) && !isArray(ids) && ids !== 0) {
					ids = [ids];
				}
				if(isUndefined(ids)) {
					ids = [];
				}

				var newUrl = String(url).replace(/@ID/g, function(replace) {
					var count = 0;
					return function() {
						var id = replace[count++];
						if(isDefined(id) && (!isEmpty(id) || !isNull(id))) {
							return id;
						}
						return '';
					};
				}(ids));
				newUrl = '/' + newUrl;                  // Fix for resource that has no forward slash at the beginning
				newUrl = newUrl.replace(/\/\//g, '/');  // Fix double slashes
				newUrl = newUrl.replace(/\/$/g, '');    // Remove trailing slash

				if(ids === 0 || ids === 1) {
					return newUrl + '/' + ids;
				}
				return newUrl;
			}
			function isObject(obj) {
				return obj instanceof Object && !obj.hasOwnProperty('length');
			}
			function isString(data) {
				return typeof data === 'string';
			}

			this.options = function (options) {
				var resourceUrl = '';
				var defer = $q.defer();
				var config = new DTOptionsBuilder.newOptions();
				var serverSide = function (url, dataSource) {
					if(dataSource && dataSource.length > 0) {
						config.withOption('ajax', function (data, callback, settings) {
							callback(dataSource);
						});
					} else {
						config.withOption('ajax', {
							headers: {
								Token: 'my token'
							},
							dataSrc: dataSource,
							url: url,
							error: function (err) {
								if(err.status === 401) {
									// Should logout
									console.log('unauthorized');
								}
							}
						});
					}
					config.withOption('processing', true);
					config.withOption('serverSide', true);
				};

				if(options.resource && options.serverSide) {
					if(!isArray(options.resource)) {
						options.resource = [options.resource];
					}
					if(isDefined(apiResource[options.resource[0]])) {
						resourceUrl = url(apiResource[options.resource[0]], options.resource[1]);
					} else {
						resourceUrl = url(options.resource[0], options.resource[1]);
					}
					if(isDefined(options.resource[2])) {
						resourceUrl = resourceUrl + options.resource[2];
					}
					serverSide(resourceUrl, options.source || 'data');

				} else if(isDefined(options.resource) || isDefined(options.data)) {
					config = DTOptionsBuilder.fromFnPromise(function () {
						var request = function (parameters) {
							var resourceUrl = parameters.url;
							var options = parameters.options;
							
							$resource(apiUrl + resourceUrl).get().$promise.then(function (data) {
							    if(isDefined(data.results)) {
							        defer.resolve(data.results);
							    } else {
							        defer.resolve(data);
							    }
							}, function (err) {
							   console.log('Table Error', err);
							});

							defer.promise.then(function (data) {
								if(isDefined(options.resolve)) {
									if(options.resolve) {
										$timeout(function () {
											options.resolve.call(this, data);
										}, 0, false);
									}
								}
							});
						};

						/**
						 * @RESOURCE
						 */
						var renderParams = {};
						if(isDefined(options.resource)) {
							if(!isArray(options.resource)) {
								options.resource = [options.resource];
							}
							if(isDefined(apiResource[options.resource[0]])) {
								resourceUrl = url(apiResource[options.resource[0]], options.resource[1]);
							} else {
								resourceUrl = url(options.resource[0], options.resource[1]);
							}
							renderParams = {
								url: resourceUrl,
								options: options
							};
							if(isDefined(options.preRender) && options.preRender) {
								options.preRender.call(this, request, renderParams);
							} else {
								request(renderParams);
							}
							return defer.promise;
						}

						/**
						 * @DATA
						 */
						if(isDefined(options.data)) {
							if(!isArray(options.data)) {
								options.data = [options.data];
							}
							defer.resolve(options.data);
							if(isDefined(options.resolve)) {
								options.resolve.call(this, options.data);
							}

							renderParams = {
								data: options.data,
								options: options
							};
							var dataRequest = function (data) {
								return data;
							};
							if(isDefined(options.preRender) && options.preRender) {
								options.preRender.call(this, dataRequest, renderParams);
							} else {
								dataRequest(renderParams);
							}
							return defer.promise;
						} else if(isDefined(options.data) && isDefined(options.serverSide)) {
							serverSide(null, options.data);
						}
					});
				} else {
					//logger.warning('Datatable Error: data or resource is not defined in the options');
				}
				config.withPaginationType('simple_numbers');

				var languageOptions = {
					oPaginate : {
						sPrevious: '&#171;',
						sNext: '&#187;'
					},
					lengthMenu:'<span>' + 'Show' + '</span><select class="form-control pull-left">' +
					'<option value="10">10</option>' +
					'<option value="20">20</option>' +
					'<option value="50">50</option>' +
					'</select><span>' + 'Entries' + '</span>',
					emptyTable: 'No matching records found.',
					zeroRecords: 'No records found.',
					processing: '<div class="loading-overlay loader-one"></div>'
				};
				config.withLanguage(languageOptions);

				if(isDefined(options.rows)) {
					config.withOption('pageLength', options.rows);
				}
				if(isDefined(options.dom)) {
					config.withDOM(options.dom);
				}
				if(isDefined(options.search)) {
					config.withOption('bFilter', !!options.search);
				}
				if(isDefined(options.renderer)) {
					config.withOption('renderer', options.renderer);
				}
				if(isDefined(options.order)) {
					config.withOption('order', options.order);
				}
				if(isDefined(options.showLength)) {
					config.withOption('bLengthChange', options.showLength);
				} else {
					config.withOption('bLengthChange', false);
				}
				if(isDefined(options.defaultLength)) {
					if(isDefined(options.lengthMenu)) {
						config.withOption('aLengthMenu', options.lengthMenu);
					}
					config.withOption('iDisplayLength', options.defaultLength);
				}
				if(isDefined(options.specialSort)) {
					config.withOption('aaSorting', options.specialSort);
				} else {
					// Default sorting of first column to be ascending
					//if(isDefined(options.defaultSort) && options.defaultSort) {
					config.withOption('aaSorting', [[ 0, 'asc' ]]);
					//}
				}
				if(isDefined(options.scope)) {
					config.withOption('createdRow', function (row, data, index) {
						var setAttribute = function (row, value) {
							row.setAttribute(options.rowAttribute[0], value);
							return row;
						};
						if(isDefined(options.rowAttribute)) {
							if(options.rowAttribute[1]) {
								var compiled = options.rowAttribute[1].call(row, data, setAttribute);
								$compile(compiled)(options.scope);
							} else {
								row.setAttribute(options.rowAttribute[0], options.rowAttribute[1]);
								// $compile(angular.element(row).contents())(options.scope);
								$compile($(row))(options.scope);
							}
						} else {
							$compile(angular.element(row).contents())(options.scope);
						}
					});
				}
				// Fallback for createdRow
				if(isDefined(options.createdRow)) {
					config.withOption('createdRow', options.createdRow);
				}

				if(isDefined(options.buttons)) {
					if(!isArray(options.buttons)) {
						options.buttons = [options.buttons];
					}
					config.withButtons(options.buttons);
				}
				return config;
			};
			this.columns = function (resource, map) {
				map = map || {};

				var defer = $q.defer();
				//columns = [];
				$resource(resource).query().$promise.then(function (cols) {
					if(isDefined(cols.$promise)) {
						delete cols.$promise;
						delete cols.$resolved;
					}
					if(isArray(cols)) {
						angular.forEach(cols, function (col, index) {
							if(isDefined(col.key)) {
								if(isDefined(map[col.key])) {
									col.render = map[col.key];
								}
							}
							if(isDefined(map[col.data])) {
								col.render = map[col.data];
							}
							if(!isDefined(col.sortable)) {
								col.sortable = false;
							}
							if(!isDefined(col.visible)) {
								col.visble = true;
							}
							if(isDefined(col.special) && col.special === true) {
								col.render = null;
							}
							if(isDefined(col.order)) {
								col.order = [[index, col.order]];
							}
						});
						defer.resolve(cols);
					}
				});
				return defer.promise;
			};
			this.changeData = function (tableInstance, urls, callback) {
				var resource = '';
				var ids = [];
				var _promise = null;
				var defer = $q.defer();
				var promise = function (urls) {
					if(!isArray(urls)) {
						urls = [urls];
					}
					resource = urls[0];
					if(isDefined(urls[1])) {
						ids = urls[1];
					}
					if(isDefined(apiResource[resource])) {
						resource = apiResource[resource];
					}
					var resourceUrl = url(resource, ids);
					$resource(apiUrl + resourceUrl).get().$promise.then(function (data) {
						if(isDefined(data.results)) {
							defer.resolve(data.results);
						} else {
							defer.resolve(data);
						}

						if(callback) {
							if(isDefined(data.results)) {
								callback.call(this, data.results);
							} else {
								callback.call(this, data);
							}
						}
					});
					return defer.promise;
				};
				var dataSet = function (sets) {
					defer.resolve(sets);
					if(callback) {
						callback.call(this, sets);
					}
					return defer.promise;
				};
				if(isArray(urls)) {
					if(isObject(urls[0])) {
						_promise = dataSet(urls);
					} else {
						if(isDefined(urls[0]) && isString(urls[0])) {
							_promise = promise(urls);
						} else {
							_promise = dataSet(urls);
						}
					}
				}
				tableInstance.changeData(_promise);
			};
		}]);

	angular
		.module('myApp')
		.controller('mainController', ['table', function(table) {
			var vm = this;

			vm.gender = 'female';

			vm.tableInstance = null;
			vm.tableColumns = table.columns('data/columns.json', {
				image: function (data) {
					return '<img src="' + data.picture.thumbnail + '" />';
				},
				name: function(data) {
					return data.name.first + ' ' + data.name.last;
				}
			});
			vm.tableOptions = table.options({
				dom: 'rtp',
				resource: [vm.gender, '&results=20']
			});
			vm.change = function () {
				if(vm.gender === 'female') {
					vm.gender = 'male';
				} else {
					vm.gender = 'female';
				}

				vm.tableColumns = table.columns('data/other.column.json', {
					image: function(data) {
						return '<img src="' + data.picture.thumbnail + '" />';
					},
					name: function(data) {
						return data.name.first + ' ' + data.name.last;
					},
					location: function(data) {
						return data.location.city + ', ' + data.location.state;
					} 
				});
				table.changeData(vm.tableInstance, [vm.gender, '&results=20']);
			};
		}]);

	/**
	 * Bootstrap
	 */
	angular.element(document).ready(function () {
		angular.bootstrap(document, ['myApp']);
	});
}());