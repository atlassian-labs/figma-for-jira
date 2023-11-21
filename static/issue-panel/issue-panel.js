var __awaiter =
	(this && this.__awaiter) ||
	function (thisArg, _arguments, P, generator) {
		function adopt(value) {
			return value instanceof P
				? value
				: new P(function (resolve) {
						resolve(value);
				  });
		}
		return new (P || (P = Promise))(function (resolve, reject) {
			function fulfilled(value) {
				try {
					step(generator.next(value));
				} catch (e) {
					reject(e);
				}
			}
			function rejected(value) {
				try {
					step(generator['throw'](value));
				} catch (e) {
					reject(e);
				}
			}
			function step(result) {
				result.done
					? resolve(result.value)
					: adopt(result.value).then(fulfilled, rejected);
			}
			step((generator = generator.apply(thisArg, _arguments || [])).next());
		});
	};
var __generator =
	(this && this.__generator) ||
	function (thisArg, body) {
		var _ = {
				label: 0,
				sent: function () {
					if (t[0] & 1) throw t[1];
					return t[1];
				},
				trys: [],
				ops: [],
			},
			f,
			y,
			t,
			g;
		return (
			(g = { next: verb(0), throw: verb(1), return: verb(2) }),
			typeof Symbol === 'function' &&
				(g[Symbol.iterator] = function () {
					return this;
				}),
			g
		);
		function verb(n) {
			return function (v) {
				return step([n, v]);
			};
		}
		function step(op) {
			if (f) throw new TypeError('Generator is already executing.');
			while (_)
				try {
					if (
						((f = 1),
						y &&
							(t =
								op[0] & 2
									? y['return']
									: op[0]
									? y['throw'] || ((t = y['return']) && t.call(y), 0)
									: y.next) &&
							!(t = t.call(y, op[1])).done)
					)
						return t;
					if (((y = 0), t)) op = [op[0] & 2, t.value];
					switch (op[0]) {
						case 0:
						case 1:
							t = op;
							break;
						case 4:
							_.label++;
							return { value: op[1], done: false };
						case 5:
							_.label++;
							y = op[1];
							op = [0];
							continue;
						case 7:
							op = _.ops.pop();
							_.trys.pop();
							continue;
						default:
							if (
								!((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
								(op[0] === 6 || op[0] === 2)
							) {
								_ = 0;
								continue;
							}
							if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
								_.label = op[1];
								break;
							}
							if (op[0] === 6 && _.label < t[1]) {
								_.label = t[1];
								t = op;
								break;
							}
							if (t && _.label < t[2]) {
								_.label = t[2];
								_.ops.push(op);
								break;
							}
							if (t[2]) _.ops.pop();
							_.trys.pop();
							continue;
					}
					op = body.call(thisArg, _);
				} catch (e) {
					op = [6, e];
					y = 0;
				} finally {
					f = t = 0;
				}
			if (op[0] & 5) throw op[1];
			return { value: op[0] ? op[1] : void 0, done: true };
		}
	};
var __spreadArray =
	(this && this.__spreadArray) ||
	function (to, from, pack) {
		if (pack || arguments.length === 2)
			for (var i = 0, l = from.length, ar; i < l; i++) {
				if (ar || !(i in from)) {
					if (!ar) ar = Array.prototype.slice.call(from, 0, i);
					ar[i] = from[i];
				}
			}
		return to.concat(ar || Array.prototype.slice.call(from));
	};
var PLUGIN_KEY = 'com.figma.jira-add-on';
var KEY_ATTACHED_DESIGN_URL = 'attached-design-url';
var KEY_ATTACHED_DESIGN_URL_V2 = 'attached-design-url-v2';
function logInfo(s) {
	console.log(s);
}
var FigmaAPI;
(function (FigmaAPI) {
	function getFileName(fileKey) {
		return __awaiter(this, void 0, void 0, function () {
			var resp, data, name_1;
			return __generator(this, function (_a) {
				switch (_a.label) {
					case 0:
						return [
							4,
							fetch('https://www.figma.com/api/file_metadata/'.concat(fileKey)),
						];
					case 1:
						resp = _a.sent();
						if (!resp.ok) return [3, 3];
						return [4, resp.json()];
					case 2:
						data = _a.sent();
						name_1 = data.meta.name;
						return [2, name_1 !== null && name_1 !== void 0 ? name_1 : ''];
					case 3:
						throw new Error('Error fetching file name');
				}
			});
		});
	}
	FigmaAPI.getFileName = getFileName;
	function addRelatedLink(_a) {
		var fileKey = _a.fileKey,
			nodeId = _a.nodeId,
			url = _a.url,
			linkName = _a.linkName;
		return __awaiter(this, void 0, void 0, function () {
			var resp, data;
			return __generator(this, function (_b) {
				switch (_b.label) {
					case 0:
						return [
							4,
							fetch(
								'https://www.figma.com/api/files/'.concat(
									fileKey,
									'/related_links',
								),
								{
									method: 'POST',
									headers: {
										'Content-Type': 'application/json',
									},
									body: JSON.stringify({
										node_id: nodeId,
										link_name: linkName,
										link_url: url,
									}),
								},
							),
						];
					case 1:
						resp = _b.sent();
						if (!!resp.ok) return [3, 3];
						return [4, resp.json()];
					case 2:
						data = _b.sent();
						console.error(data);
						_b.label = 3;
					case 3:
						return [2];
				}
			});
		});
	}
	function maybeAddRelatedLink(linkUrl, issueKey) {
		var _a, _b, _c;
		return __awaiter(this, void 0, void 0, function () {
			var info, fileKey, nodeId, _d, issueUrl, issueInfo, linkName, e_1;
			return __generator(this, function (_e) {
				switch (_e.label) {
					case 0:
						info = infoForURL(linkUrl);
						if (!info) {
							console.error('Invalid linkUrl: '.concat(linkUrl));
							return [2];
						}
						_e.label = 1;
					case 1:
						_e.trys.push([1, 4, , 5]);
						fileKey = info.fileKey;
						nodeId =
							(_a = getNodeIdFromFigmaUrl(linkUrl)) !== null && _a !== void 0
								? _a
								: '';
						return [
							4,
							Promise.all([
								new Promise(function (resolve) {
									return AP.getLocation(resolve);
								}),
								JiraAPI.getIssueInfo(issueKey),
							]),
						];
					case 2:
						(_d = _e.sent()), (issueUrl = _d[0]), (issueInfo = _d[1]);
						linkName = '['
							.concat(issueKey, '] ')
							.concat(
								(_c =
									(_b =
										issueInfo === null || issueInfo === void 0
											? void 0
											: issueInfo.fields) === null || _b === void 0
										? void 0
										: _b.summary) !== null && _c !== void 0
									? _c
									: '',
							);
						return [
							4,
							addRelatedLink({
								nodeId: nodeId,
								fileKey: fileKey,
								url: issueUrl,
								linkName: linkName,
							}),
						];
					case 3:
						_e.sent();
						return [3, 5];
					case 4:
						e_1 = _e.sent();
						console.error('Error adding dev resource '.concat(e_1));
						return [3, 5];
					case 5:
						return [2];
				}
			});
		});
	}
	FigmaAPI.maybeAddRelatedLink = maybeAddRelatedLink;
	function removeRelatedLink(_a) {
		var nodeId = _a.nodeId,
			fileKey = _a.fileKey,
			url = _a.url;
		return __awaiter(this, void 0, void 0, function () {
			var resp, data;
			return __generator(this, function (_b) {
				switch (_b.label) {
					case 0:
						return [
							4,
							fetch(
								'https://www.figma.com/api/files/'.concat(
									fileKey,
									'/related_links',
								),
								{
									method: 'DELETE',
									headers: {
										'Content-Type': 'application/json',
									},
									body: JSON.stringify({
										node_id: nodeId,
										link_url: url,
									}),
								},
							),
						];
					case 1:
						resp = _b.sent();
						if (!!resp.ok) return [3, 3];
						return [4, resp.json()];
					case 2:
						data = _b.sent();
						console.error(data);
						_b.label = 3;
					case 3:
						return [2];
				}
			});
		});
	}
	function maybeRemoveRelatedLink(linkUrl, issueKey) {
		var _a;
		return __awaiter(this, void 0, void 0, function () {
			var info, fileKey, nodeId, issueUrl, e_2;
			return __generator(this, function (_b) {
				switch (_b.label) {
					case 0:
						info = infoForURL(linkUrl);
						if (!info) {
							console.error('Invalid linkUrl: '.concat(linkUrl));
							return [2];
						}
						_b.label = 1;
					case 1:
						_b.trys.push([1, 4, , 5]);
						fileKey = info.fileKey;
						nodeId =
							(_a = getNodeIdFromFigmaUrl(linkUrl)) !== null && _a !== void 0
								? _a
								: '';
						return [
							4,
							new Promise(function (resolve) {
								return AP.getLocation(resolve);
							}),
						];
					case 2:
						issueUrl = _b.sent();
						return [
							4,
							removeRelatedLink({
								nodeId: nodeId,
								fileKey: fileKey,
								url: issueUrl,
							}),
						];
					case 3:
						_b.sent();
						return [3, 5];
					case 4:
						e_2 = _b.sent();
						console.error('Error removing dev resource '.concat(e_2));
						return [3, 5];
					case 5:
						return [2];
				}
			});
		});
	}
	FigmaAPI.maybeRemoveRelatedLink = maybeRemoveRelatedLink;
})(FigmaAPI || (FigmaAPI = {}));
var JiraAPI;
(function (JiraAPI) {
	function setPropertyForIssue(issueKey, propertyKey, propertyValue) {
		return __awaiter(this, void 0, void 0, function () {
			return __generator(this, function (_a) {
				switch (_a.label) {
					case 0:
						return [
							4,
							new Promise(function (resolve) {
								AP.request(
									'/rest/api/2/issue/'
										.concat(issueKey, '/properties/')
										.concat(propertyKey),
									{
										type: 'PUT',
										contentType: 'application/json',
										data: JSON.stringify(propertyValue),
										success: resolve,
										error: function (e) {
											console.error(e);
											resolve();
										},
									},
								);
							}),
						];
					case 1:
						_a.sent();
						return [2];
				}
			});
		});
	}
	JiraAPI.setPropertyForIssue = setPropertyForIssue;
	function deletePropertyForIssue(issueKey, propertyKey) {
		return __awaiter(this, void 0, void 0, function () {
			return __generator(this, function (_a) {
				switch (_a.label) {
					case 0:
						return [
							4,
							new Promise(function (resolve) {
								AP.request(
									'/rest/api/2/issue/'
										.concat(issueKey, '/properties/')
										.concat(propertyKey),
									{
										type: 'DELETE',
										contentType: 'application/json',
										success: resolve,
										error: function (e) {
											console.error(e);
											resolve();
										},
									},
								);
							}),
						];
					case 1:
						_a.sent();
						return [2];
				}
			});
		});
	}
	JiraAPI.deletePropertyForIssue = deletePropertyForIssue;
	function getPropertyForIssue(issueKey, propertyKey) {
		return __awaiter(this, void 0, void 0, function () {
			return __generator(this, function (_a) {
				switch (_a.label) {
					case 0:
						return [
							4,
							new Promise(function (resolve, reject) {
								AP.request(
									'/rest/api/2/issue/' +
										issueKey +
										'/properties/' +
										propertyKey,
									{
										type: 'GET',
										contentType: 'application/json',
										success: function (data) {
											resolve(JSON.parse(data));
										},
										error: function (resp) {
											if (resp.status === 404) {
												resolve(null);
											} else {
												reject(resp);
											}
										},
									},
								);
							}),
						];
					case 1:
						return [2, _a.sent()];
				}
			});
		});
	}
	JiraAPI.getPropertyForIssue = getPropertyForIssue;
	function getIssueInfo(issueKey) {
		return __awaiter(this, void 0, void 0, function () {
			return __generator(this, function (_a) {
				switch (_a.label) {
					case 0:
						return [
							4,
							new Promise(function (resolve, reject) {
								AP.request('/rest/api/2/issue/' + issueKey, {
									type: 'GET',
									contentType: 'application/json',
									success: function (data) {
										resolve(JSON.parse(data));
									},
									error: function (resp) {
										if (resp.status === 404) {
											resolve(null);
										} else {
											reject(resp);
										}
									},
								});
							}),
						];
					case 1:
						return [2, _a.sent()];
				}
			});
		});
	}
	JiraAPI.getIssueInfo = getIssueInfo;
})(JiraAPI || (JiraAPI = {}));
function getUrlParam(paramKey) {
	var result = new RegExp(paramKey + '=([^&]*)').exec(window.location.search);
	if (result == null || result.length === 0) {
		return null;
	}
	var codedParamValue = result[1];
	return decodeURIComponent(codedParamValue);
}
var urlToDiv = {};
var validURLChecker =
	/^https:\/\/([\w\.-]+\.)?figma[.](?:com|engineering)\/(file|proto)\/([0-9a-zA-Z]{22,128})(?:\/([^\\?]*))?\\?.*$/;
function isValidFigmaFileURL(url) {
	return validURLChecker.exec(url) != null;
}
function infoForURL(url) {
	if (url == null) {
		return null;
	}
	var match = validURLChecker.exec(url);
	if (match != null && match[2] != null && match[3] != null) {
		return {
			domainPrefix: match[1] == null ? '' : match[1],
			type: match[2],
			fileKey: match[3],
			name:
				(match[4] ? decodeURI(match[4]).replace(/-/g, ' ') : undefined) ||
				'Untitled',
		};
	}
	return null;
}
function getNodeIdFromFigmaUrl(url) {
	var _a;
	if (!url || !validURLChecker.exec(url)) {
		return null;
	}
	var nodeId =
		(_a = new URL(url).searchParams.get('node-id')) !== null && _a !== void 0
			? _a
			: '';
	var parts = nodeId.split(/[:-]/);
	if (!parts || parts.length !== 2) {
		return null;
	}
	var sessionID = -1;
	var localID = -1;
	try {
		sessionID = parseInt(parts[0]);
		localID = parseInt(parts[1]);
	} catch (e) {
		return null;
	}
	if (!isFinite(sessionID) || !isFinite(localID)) {
		return null;
	}
	return ''.concat(sessionID, ':').concat(localID);
}
var Page;
(function (Page) {
	Page[(Page['LOADING'] = 0)] = 'LOADING';
	Page[(Page['ATTACH_DESIGN'] = 1)] = 'ATTACH_DESIGN';
	Page[(Page['SHOW_DESIGN'] = 2)] = 'SHOW_DESIGN';
})(Page || (Page = {}));
var HintType;
(function (HintType) {
	HintType[(HintType['DEFAULT'] = 0)] = 'DEFAULT';
	HintType[(HintType['ERROR'] = 1)] = 'ERROR';
	HintType[(HintType['URL_ALREADY_ADDED'] = 2)] = 'URL_ALREADY_ADDED';
})(HintType || (HintType = {}));
var OpenFileMode;
(function (OpenFileMode) {
	OpenFileMode[(OpenFileMode['NONE'] = 0)] = 'NONE';
	OpenFileMode[(OpenFileMode['INSPECT'] = 1)] = 'INSPECT';
	OpenFileMode[(OpenFileMode['COMMENTS'] = 2)] = 'COMMENTS';
})(OpenFileMode || (OpenFileMode = {}));
var FigmaAddon = (function () {
	function FigmaAddon(issueKey) {
		var _this = this;
		this.issueKey = issueKey;
		this.pages = {
			loading: {
				root: document.getElementById('page-loading'),
			},
			attachDesign: {
				root: document.getElementById('page-attach-design'),
				input: document.getElementById('design-url-input'),
				button: document.getElementById('design-url-button'),
				hint: document.getElementById('hint'),
				form: document.getElementById('attach-design-form'),
			},
			showDesign: {
				root: document.getElementById('page-show-design'),
				buttonOpenInFigma: document.getElementById('button-open-in-figma'),
				buttonRemoveDesign: document.getElementById('button-remove-design'),
				buttonComment: document.getElementById('button-comment'),
				buttonInspect: document.getElementById('button-inspect'),
				divViewerContainer: document.getElementById('viewer-container'),
				designList: document.getElementById('design-list'),
				iframe: null,
			},
		};
		this.currentPageInfo = null;
		this.links = [];
		this.updateAttachedLinks = function (_a) {
			var _b = _a.toAdd,
				toAdd = _b === void 0 ? [] : _b,
				_c = _a.toRemove,
				toRemove = _c === void 0 ? [] : _c;
			return __awaiter(_this, void 0, void 0, function () {
				var shouldRerenderPage,
					_d,
					legacyUrl,
					links,
					newLinkUrls,
					currentLinkUrls,
					addedLinks,
					_loop_1,
					_i,
					toAdd_1,
					link;
				var _this = this;
				return __generator(this, function (_e) {
					switch (_e.label) {
						case 0:
							shouldRerenderPage = false;
							return [
								4,
								Promise.all([
									this.getAttachedLegacyDesignOrNull(),
									this.getAllAttachedDesigns(),
								]),
							];
						case 1:
							(_d = _e.sent()), (legacyUrl = _d[0]), (links = _d[1]);
							newLinkUrls = new Set(
								links.map(function (link) {
									return link.url;
								}),
							);
							currentLinkUrls = new Set(
								this.links.map(function (link) {
									return link.url;
								}),
							);
							if (
								newLinkUrls.size !== currentLinkUrls.size ||
								links.some(function (link) {
									return !currentLinkUrls.has(link.url);
								})
							) {
								shouldRerenderPage = true;
							}
							addedLinks = [];
							_loop_1 = function (link) {
								var existingLink = links.find(function (l) {
									return link.url === l.url;
								});
								if (existingLink) {
									existingLink.name = link.name;
								} else {
									links.push(link);
									addedLinks.push(link);
									shouldRerenderPage = true;
								}
							};
							for (_i = 0, toAdd_1 = toAdd; _i < toAdd_1.length; _i++) {
								link = toAdd_1[_i];
								_loop_1(link);
							}
							links = links.filter(function (l) {
								return toRemove.indexOf(l.url) === -1;
							});
							return [
								4,
								Promise.allSettled([
									(function () {
										return __awaiter(_this, void 0, void 0, function () {
											var _this = this;
											return __generator(this, function (_a) {
												switch (_a.label) {
													case 0:
														return [
															4,
															Promise.all(
																addedLinks.map(function (link) {
																	return __awaiter(
																		_this,
																		void 0,
																		void 0,
																		function () {
																			return __generator(this, function (_a) {
																				switch (_a.label) {
																					case 0:
																						return [
																							4,
																							FigmaAPI.maybeAddRelatedLink(
																								link.url,
																								this.issueKey,
																							),
																						];
																					case 1:
																						_a.sent();
																						return [2];
																				}
																			});
																		},
																	);
																}),
															),
														];
													case 1:
														_a.sent();
														return [2];
												}
											});
										});
									})(),
									(function () {
										return __awaiter(_this, void 0, void 0, function () {
											var _this = this;
											return __generator(this, function (_a) {
												switch (_a.label) {
													case 0:
														return [
															4,
															Promise.all(
																toRemove.map(function (url) {
																	return __awaiter(
																		_this,
																		void 0,
																		void 0,
																		function () {
																			return __generator(this, function (_a) {
																				switch (_a.label) {
																					case 0:
																						return [
																							4,
																							FigmaAPI.maybeRemoveRelatedLink(
																								url,
																								this.issueKey,
																							),
																						];
																					case 1:
																						_a.sent();
																						return [2];
																				}
																			});
																		},
																	);
																}),
															),
														];
													case 1:
														_a.sent();
														return [2];
												}
											});
										});
									})(),
									(function () {
										return __awaiter(_this, void 0, void 0, function () {
											return __generator(this, function (_a) {
												switch (_a.label) {
													case 0:
														if (
															!(legacyUrl && toRemove.indexOf(legacyUrl) !== -1)
														)
															return [3, 2];
														return [
															4,
															JiraAPI.deletePropertyForIssue(
																this.issueKey,
																KEY_ATTACHED_DESIGN_URL,
															),
														];
													case 1:
														_a.sent();
														_a.label = 2;
													case 2:
														return [2];
												}
											});
										});
									})(),
									JiraAPI.setPropertyForIssue(
										this.issueKey,
										KEY_ATTACHED_DESIGN_URL_V2,
										JSON.stringify(links),
									),
								]),
							];
						case 2:
							_e.sent();
							this.links = links;
							if (shouldRerenderPage) {
								this.showPageForDesignWithURLs();
							}
							return [2];
					}
				});
			});
		};
		this.lookupDesignInfo = function (urls) {
			return __awaiter(_this, void 0, void 0, function () {
				var _i, urls_1, url, info, fileKey, name_2, urlRef, e_3;
				return __generator(this, function (_a) {
					switch (_a.label) {
						case 0:
							(_i = 0), (urls_1 = urls);
							_a.label = 1;
						case 1:
							if (!(_i < urls_1.length)) return [3, 8];
							url = urls_1[_i];
							info = infoForURL(url);
							if (!info) {
								return [3, 7];
							}
							fileKey = info.fileKey;
							_a.label = 2;
						case 2:
							_a.trys.push([2, 6, , 7]);
							return [4, FigmaAPI.getFileName(fileKey)];
						case 3:
							name_2 = _a.sent();
							urlRef = urlToDiv[url];
							if (!urlRef) return [3, 5];
							urlRef.name.innerText = name_2;
							return [
								4,
								this.updateAttachedLinks({
									toAdd: [{ url: url, name: name_2 }],
								}),
							];
						case 4:
							_a.sent();
							_a.label = 5;
						case 5:
							return [3, 7];
						case 6:
							e_3 = _a.sent();
							console.error(
								'Error fetching info for file '.concat(fileKey),
								e_3,
							);
							return [3, 7];
						case 7:
							_i++;
							return [3, 1];
						case 8:
							return [2];
					}
				});
			});
		};
		this.stopLoading = function () {
			_this.pages.attachDesign.input.disabled = false;
			_this.pages.loading.root.style.display = 'none';
		};
		this.getAttachedLegacyDesignOrNull = function () {
			return __awaiter(_this, void 0, void 0, function () {
				var resp, url, _a;
				return __generator(this, function (_b) {
					switch (_b.label) {
						case 0:
							_b.trys.push([0, 4, , 5]);
							return [
								4,
								JiraAPI.getPropertyForIssue(
									this.issueKey,
									KEY_ATTACHED_DESIGN_URL,
								),
							];
						case 1:
							resp = _b.sent();
							if (!resp) return [3, 3];
							url = resp.value;
							if (isValidFigmaFileURL(url)) {
								return [2, url];
							}
							console.error(
								'Retreived an invalid URL from the store. Deleting it:',
								url,
							);
							return [
								4,
								JiraAPI.deletePropertyForIssue(
									this.issueKey,
									KEY_ATTACHED_DESIGN_URL,
								),
							];
						case 2:
							_b.sent();
							_b.label = 3;
						case 3:
							return [3, 5];
						case 4:
							_a = _b.sent();
							console.error(
								'Unexpected failures while trying to fetch design for issue',
							);
							return [3, 5];
						case 5:
							return [2, null];
					}
				});
			});
		};
		this.getAttachedDesignsV2 = function () {
			return __awaiter(_this, void 0, void 0, function () {
				var resp, links, _a;
				return __generator(this, function (_b) {
					switch (_b.label) {
						case 0:
							_b.trys.push([0, 2, , 3]);
							return [
								4,
								JiraAPI.getPropertyForIssue(
									this.issueKey,
									KEY_ATTACHED_DESIGN_URL_V2,
								),
							];
						case 1:
							resp = _b.sent();
							if (resp) {
								links = JSON.parse(resp.value);
								return [
									2,
									links.filter(function (link) {
										return isValidFigmaFileURL(link.url);
									}),
								];
							}
							return [3, 3];
						case 2:
							_a = _b.sent();
							console.error(
								'unexpected failures while trying to fetch design for issue',
							);
							return [3, 3];
						case 3:
							return [2, []];
					}
				});
			});
		};
		this.getAllAttachedDesigns = function () {
			return __awaiter(_this, void 0, void 0, function () {
				var _a, legacyUrl, links, urlInfo;
				return __generator(this, function (_b) {
					switch (_b.label) {
						case 0:
							return [
								4,
								Promise.all([
									this.getAttachedLegacyDesignOrNull(),
									this.getAttachedDesignsV2(),
								]),
							];
						case 1:
							(_a = _b.sent()), (legacyUrl = _a[0]), (links = _a[1]);
							if (!legacyUrl) return [3, 3];
							if (
								!!links.find(function (link) {
									return link.url === legacyUrl;
								})
							)
								return [3, 3];
							urlInfo = infoForURL(legacyUrl);
							links.push({
								url: legacyUrl,
								name:
									(urlInfo === null || urlInfo === void 0
										? void 0
										: urlInfo.name) || 'Untitled',
							});
							return [
								4,
								JiraAPI.setPropertyForIssue(
									this.issueKey,
									KEY_ATTACHED_DESIGN_URL_V2,
									JSON.stringify(links),
								),
							];
						case 2:
							_b.sent();
							_b.label = 3;
						case 3:
							return [2, links];
					}
				});
			});
		};
		this.loadAttachedDesignsIfExists = function () {
			return __awaiter(_this, void 0, void 0, function () {
				var links, urls;
				return __generator(this, function (_a) {
					switch (_a.label) {
						case 0:
							return [4, this.getAllAttachedDesigns()];
						case 1:
							links = _a.sent();
							urls = links.map(function (link) {
								return link.url;
							});
							this.lookupDesignInfo(urls);
							this.links = __spreadArray([], links, true);
							this.showPageForDesignWithURLs();
							this.stopLoading();
							return [2];
					}
				});
			});
		};
		this.onClickOpenInFigma = function (mode) {
			if (_this.currentPageInfo == null || _this.currentPageInfo.url == null) {
				console.error(
					"user clicked 'Open In Figma' but currentPageInfo or its URL is missing",
				);
				return;
			}
			var url = FigmaAddon.destinationForURLOpen(mode, _this.currentPageInfo);
			if (url) {
				window.open(url, '_blank');
			}
		};
		this.onClickRemoveDesign = function () {
			return __awaiter(_this, void 0, void 0, function () {
				var removedUrl, div;
				var _a, _b, _c;
				return __generator(this, function (_d) {
					switch (_d.label) {
						case 0:
							removedUrl =
								(_a = this.currentPageInfo) === null || _a === void 0
									? void 0
									: _a.url;
							if (!removedUrl) {
								return [2];
							}
							this.currentPageInfo = null;
							this.showPage(Page.LOADING);
							return [4, this.updateAttachedLinks({ toRemove: [removedUrl] })];
						case 1:
							_d.sent();
							logInfo('Successfully removed design for issue ' + this.issueKey);
							div =
								(_b = urlToDiv[removedUrl]) === null || _b === void 0
									? void 0
									: _b.collapsed;
							(_c =
								div === null || div === void 0 ? void 0 : div.parentElement) ===
								null || _c === void 0
								? void 0
								: _c.removeChild(div);
							this.pages.loading.root.style.display = 'none';
							if (this.links.length === 0) {
								this.pages.showDesign.designList.style.display = 'none';
							}
							return [2];
					}
				});
			});
		};
		this.onClickAttachDesign = function () {
			return __awaiter(_this, void 0, void 0, function () {
				var input, value, info, link;
				return __generator(this, function (_a) {
					switch (_a.label) {
						case 0:
							input = this.pages.attachDesign.input;
							value = input.value;
							if (value == null || value.length === 0) {
								this.setHintHTML(HintType.DEFAULT);
								return [2];
							}
							if (!isValidFigmaFileURL(value)) {
								this.setHintHTML(HintType.ERROR);
								return [2];
							}
							if (
								this.links.some(function (link) {
									return link.url === value;
								})
							) {
								this.setHintHTML(HintType.URL_ALREADY_ADDED);
								return [2];
							}
							info = infoForURL(value);
							link = {
								url: value,
								name:
									(info === null || info === void 0 ? void 0 : info.name) ||
									'Untitled',
							};
							input.disabled = true;
							return [4, this.updateAttachedLinks({ toAdd: [link] })];
						case 1:
							_a.sent();
							this.currentPageInfo = { url: value };
							this.showPageForDesignWithURLs();
							return [4, this.lookupDesignInfo([value])];
						case 2:
							_a.sent();
							return [2];
					}
				});
			});
		};
		this.showPage = function (page, pageInfo) {
			if (pageInfo === void 0) {
				pageInfo = null;
			}
			var _a = _this.pages,
				loading = _a.loading,
				attachDesign = _a.attachDesign,
				showDesign = _a.showDesign;
			_this.currentPageInfo = pageInfo;
			loading.root.style.display = 'none';
			showDesign.root.style.display = 'none';
			_this.setHintHTML(HintType.DEFAULT);
			attachDesign.input.value = null;
			var iframe = showDesign.iframe;
			if (iframe && iframe.parentNode) {
				iframe.parentNode.removeChild(iframe);
			}
			switch (page) {
				case Page.ATTACH_DESIGN:
					attachDesign.root.style.display = '';
					break;
				case Page.SHOW_DESIGN:
					showDesign.root.style.display = '';
					break;
				case Page.LOADING:
					loading.root.style.display = '';
					break;
			}
			AP.resize();
		};
		this.setCollapseOnClick = function (url, collapsed, caret) {
			var designList = _this.pages.showDesign.designList;
			collapsed.onclick = function () {
				var _a;
				var isCurrent =
					url ===
					((_a = _this.currentPageInfo) === null || _a === void 0
						? void 0
						: _a.url);
				if (isCurrent) {
					_this.hideIframe();
				} else {
					_this.showPageForDesignWithURL(url);
					designList.insertBefore(
						_this.pages.showDesign.root,
						collapsed.nextSibling,
					);
				}
				caret.classList.toggle('rotated');
			};
		};
		this.showPageForDesignWithURLs = function () {
			var _a;
			if (_this.links.length === 1) {
				_this.currentPageInfo = { url: _this.links[0].url };
			}
			urlToDiv = {};
			var designList = _this.pages.showDesign.designList;
			var toRemove = [];
			for (
				var child = designList.firstElementChild;
				child != null;
				child = child.nextElementSibling
			) {
				if (child.id !== 'page-show-design') {
					toRemove.push(child);
				}
			}
			_this.pages.showDesign.root.style.display = 'none';
			for (var _i = 0, toRemove_1 = toRemove; _i < toRemove_1.length; _i++) {
				var child = toRemove_1[_i];
				designList.removeChild(child);
			}
			var foundExpanded = false;
			for (var _b = 0, _c = _this.links; _b < _c.length; _b++) {
				var link = _c[_b];
				var url = link.url,
					name_3 = link.name;
				var isCurrent =
					url ===
					((_a = _this.currentPageInfo) === null || _a === void 0
						? void 0
						: _a.url);
				var collapsed = document.createElement('div');
				var header = document.createElement('div');
				header.className = 'collapsed-header';
				var logo = document.createElement('img');
				logo.src = 'figma.png';
				logo.className = 'collapsed-logo';
				header.appendChild(logo);
				var title = document.createElement('div');
				title.className = 'collapsed-title';
				title.innerText = name_3;
				header.appendChild(title);
				collapsed.appendChild(header);
				var caret = document.createElement('img');
				caret.className = 'collapsed-caret rotated';
				caret.src = 'chevron-down.svg';
				collapsed.appendChild(caret);
				collapsed.className = 'collapsed';
				_this.setCollapseOnClick(url, collapsed, caret);
				urlToDiv[url] = { name: title, collapsed: collapsed, link: link };
				if (foundExpanded) {
					designList.appendChild(collapsed);
				} else {
					designList.insertBefore(collapsed, _this.pages.showDesign.root);
				}
				if (isCurrent) {
					foundExpanded = true;
					caret.classList.toggle('rotated');
					_this.showPageForDesignWithURL(url);
				}
			}
			_this.stopLoading();
			if (_this.links.length > 0) {
				designList.style.display = '';
			} else {
				designList.style.display = 'none';
			}
			AP.resize();
		};
		this.hideIframe = function () {
			var iframe = _this.pages.showDesign.iframe;
			if (iframe && iframe.parentNode) {
				iframe.parentNode.removeChild(iframe);
			}
			_this.currentPageInfo = null;
			_this.pages.showDesign.root.style.display = 'none';
			AP.resize();
		};
		this.showPageForDesignWithURL = function (url) {
			_this.showPage(Page.SHOW_DESIGN, { url: url });
			_this.pages.showDesign.iframe = document.createElement('iframe');
			_this.pages.showDesign.iframe.src =
				'https://figma.com/embed?url=' + url + '&embed_host=figma-jira-add-on';
			_this.pages.showDesign.iframe.onload = function () {
				logInfo('viewer iframe loaded');
				AP.resize();
			};
			_this.pages.showDesign.divViewerContainer.appendChild(
				_this.pages.showDesign.iframe,
			);
		};
		var _a = this.pages,
			attachDesign = _a.attachDesign,
			showDesign = _a.showDesign;
		attachDesign.button.addEventListener('click', this.onClickAttachDesign);
		attachDesign.form.addEventListener('submit', function (e) {
			e.preventDefault();
			_this.onClickAttachDesign();
		});
		showDesign.buttonOpenInFigma.addEventListener(
			'click',
			this.onClickOpenInFigma.bind(null, OpenFileMode.NONE),
		);
		showDesign.buttonRemoveDesign.addEventListener(
			'click',
			this.onClickRemoveDesign,
		);
		showDesign.buttonInspect.addEventListener(
			'click',
			this.onClickOpenInFigma.bind(null, OpenFileMode.INSPECT),
		);
		showDesign.buttonComment.addEventListener(
			'click',
			this.onClickOpenInFigma.bind(null, OpenFileMode.COMMENTS),
		);
		showDesign.designList.style.display = 'none';
		this.setHintHTML(HintType.DEFAULT);
		this.showPage(Page.LOADING);
		this.loadAttachedDesignsIfExists();
	}
	FigmaAddon.prototype.setHintHTML = function (type) {
		if (type === void 0) {
			type = HintType.DEFAULT;
		}
		var attachDesign = this.pages.attachDesign;
		switch (type) {
			case HintType.DEFAULT: {
				attachDesign.hint.style.color = '';
				attachDesign.hint.innerHTML = FigmaAddon.defaultHintHTML;
				break;
			}
			case HintType.ERROR: {
				var figmaRed = '#EB5757';
				attachDesign.hint.style.color = figmaRed;
				attachDesign.hint.innerHTML = FigmaAddon.invalidURLHTML;
				break;
			}
			case HintType.URL_ALREADY_ADDED: {
				var figmaRed = '#EB5757';
				attachDesign.hint.style.color = figmaRed;
				attachDesign.hint.innerHTML = FigmaAddon.urlAlreadyAdded;
				break;
			}
		}
	};
	FigmaAddon.defaultHintHTML =
		'\n  Paste the URL for a public Figma file to attach it to this JIRA issue. <a target="_blank" href="https://help.figma.com/hc/en-us/articles/360039827834#Permissions">Learn more</a>\n  ';
	FigmaAddon.invalidURLHTML =
		'\n  That doesn\'t look like a Figma URL. <a target="_blank" href="https://help.figma.com/hc/en-us/articles/360039827834#Permissions">Learn more</a>\n  ';
	FigmaAddon.urlAlreadyAdded =
		'\n  That URL has already been added to this issue.\n  ';
	FigmaAddon.destinationForURLOpen = function (mode, pageInfo) {
		var info = infoForURL(pageInfo.url);
		if (info == null) {
			return null;
		}
		var destination = null;
		if (info.type === 'proto' && mode === OpenFileMode.INSPECT) {
			destination = 'https://'
				.concat(info.domainPrefix, 'figma.com/file/')
				.concat(info.fileKey, '/?properties-panel-tab=code');
		} else {
			destination = pageInfo.url;
			var hashIndex = destination.indexOf('#');
			if (hashIndex !== -1) {
				destination = destination.substr(0, hashIndex);
			}
			if (mode === OpenFileMode.INSPECT) {
				if (destination.indexOf('?') === -1) {
					destination += '?';
				} else {
					destination += '&';
				}
				destination += 'properties-panel-tab=code';
			}
			if (mode === OpenFileMode.COMMENTS) {
				destination += '#-1';
			}
		}
		return destination;
	};
	return FigmaAddon;
})();
var issueKey = getUrlParam('issueKey');
var connectLoader = document.getElementById('connect-loader');
if (issueKey == null || connectLoader == null) {
	console.error('Invalid URL params to issue-panel.html');
} else {
	logInfo('Booting Figma JIRA integration for issueKey '.concat(issueKey));
	var options = connectLoader.getAttribute('data-options');
	var script = document.createElement('script');
	script.src = 'https://connect-cdn.atl-paas.net/all.js';
	if (options) {
		script.setAttribute('data-options', options);
	}
	document.getElementsByTagName('head')[0].appendChild(script);
	script.onload = function () {
		window['figmaAddon'] = new FigmaAddon(issueKey);
	};
	runTests();
}
function runTests() {
	var fileKey = 'aaaaabbbbbcccccdddddee';
	var defaultFileURL = 'https://figma.com/file/'.concat(fileKey, '/');
	var defaultProtoURL = 'https://figma.com/proto/'.concat(fileKey, '/');
	var getDest = function (mode, url) {
		return FigmaAddon.destinationForURLOpen(mode, { url: url });
	};
	test('FigmaAddon.destinationForURLOpen for invalid URLs', function () {
		assert(
			getDest(
				OpenFileMode.NONE,
				'https://notfigma.com/file/'.concat(fileKey, '/'),
			) == null,
			"Don't open non-Figma links",
		);
		assert(
			getDest(
				OpenFileMode.NONE,
				'http://figma.com/file/'.concat(fileKey, '/'),
			) == null,
			"Don't open non-https links",
		);
	});
	test('FigmaAddon.destinationForURLOpen for file URLs', function () {
		assert(
			getDest(OpenFileMode.NONE, defaultFileURL) == defaultFileURL,
			"Don't edit the URL for mode .NONE",
		);
		assert(
			getDest(OpenFileMode.NONE, defaultFileURL + '#someHash') ==
				defaultFileURL,
			'Strip the hash if there is one (the user probably copied a comments link by mistake)',
		);
		assert(
			getDest(OpenFileMode.INSPECT, defaultFileURL) ==
				defaultFileURL + '?properties-panel-tab=code',
			'Set the properties panel tab appropriately for INSPECT mode',
		);
		assert(
			getDest(OpenFileMode.INSPECT, defaultFileURL + '?someparam=blah') ==
				defaultFileURL + '?someparam=blah&properties-panel-tab=code',
			'Preserve URL parameters when opening in INSPECT mode',
		);
		assert(
			getDest(OpenFileMode.COMMENTS, defaultFileURL) == defaultFileURL + '#-1',
			'Append commentThreadId = -1 for COMMENTS mode',
		);
		assert(
			getDest(OpenFileMode.COMMENTS, defaultFileURL + '?someparam=blah') ==
				defaultFileURL + '?someparam=blah#-1',
			'Preserve URL parameters when opening in COMMENTS mode',
		);
	});
	test('FigmaAddon.destinationForURLOpen for proto URLs', function () {
		assert(
			getDest(OpenFileMode.NONE, defaultProtoURL) == defaultProtoURL,
			"Don't edit the URL for mode .NONE",
		);
		assert(
			getDest(OpenFileMode.NONE, defaultProtoURL + '#someHash') ==
				defaultProtoURL,
			'Strip the hash if there is one (the user probably copied a comments link by mistake)',
		);
		assert(
			getDest(OpenFileMode.INSPECT, defaultProtoURL) ==
				defaultFileURL + '?properties-panel-tab=code',
			"Redirect to a /file URL for INSPECT mode (prototypes don't have an INSPECT feature)",
		);
		assert(
			getDest(OpenFileMode.INSPECT, defaultProtoURL + '?someparam=blah') ==
				defaultProtoURL + '?properties-panel-tab=code',
			'Remove URL parameters when opening in INSPECT mode since they may not apply to /file links',
		);
		assert(
			getDest(OpenFileMode.COMMENTS, defaultProtoURL) ==
				defaultProtoURL + '#-1',
			'Append commentThreadId = -1 for COMMENTS mode',
		);
		assert(
			getDest(OpenFileMode.COMMENTS, defaultProtoURL + '?someparam=blah') ==
				defaultProtoURL + '?someparam=blah#-1',
			'Preserve URL parameters when opening in COMMENTS mode',
		);
	});
	test('getNodeIdFromFigmaUrl', function () {
		assert(
			getNodeIdFromFigmaUrl(
				''.concat(defaultFileURL, '/fileName?node-id=1:2'),
			) == '1:2',
			'Parses node-id query param properly (:)',
		);
		assert(
			getNodeIdFromFigmaUrl(
				''.concat(defaultFileURL, '/fileName?node-id=1-2'),
			) == '1:2',
			'Parses node-id query param properly (-)',
		);
		assert(
			getNodeIdFromFigmaUrl(''.concat(defaultFileURL, '/fileName')) == null,
			'Ignore if node-id query param is missing',
		);
		assert(
			getNodeIdFromFigmaUrl(
				''.concat(defaultFileURL, '/fileName?node-id=blah'),
			) == null,
			'Ignore if node-id query param is invalid',
		);
	});
}
function assert(value, message) {
	if (!value) {
		throw new Error(message);
	}
}
function test(description, implementation) {
	try {
		implementation();
		console.log('[test] '.concat(description, ' passed'));
	} catch (e) {
		console.error(
			'[test] '.concat(description, ' failed with error ').concat(e.message),
		);
	}
}
