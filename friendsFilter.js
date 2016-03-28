;
(function() {
    "use strict";

    function Friend(obj) {
        this.fullName = obj.first_name + ' ' + obj.last_name;
        this.firstName = obj.first_name;
        this.lastName = obj.last_name;
        this.photo = obj.photo_50;
        this.userId = obj.uid;
        this.htmlObject = {};
    };

    function FriendFilter(options) {
        //it's singletone
        if (FriendFilter.instance) {
            return FriendFilter.instance
        }
        FriendFilter.instance = this;

        var self = this;

        this.leftFriendList = [];

        this.rightFriendList = [];

        this.userId = 0;

        this.checkSession = function(successCallback, rejectCallback) {
            VK.init({
                apiId: options.appId
            });

            VK.Auth.getLoginStatus(function(response) {
                if (response.session) {
                    successCallback(response);
                } else {
                    rejectCallback(response);
                }
            });
        };

        this.authorize = function(successCallback, rejectCallback) {
            VK.init({
                apiId: options.appId
            });
            //do not show popup every 
            VK.Auth.login(function(response) {
                if (response.session) {
                    successCallback(response);
                } else {
                    rejectCallback(new Error("Чтобы получить список друзей, необходимо аутентифицироваться"));
                }
            }, 2);
        };

        this.getUserList = function(userId, successCallback, rejectCallback) {
            VK.api('friends.get', {
                user_id: userId,
                order: "name",
                fields: "photo_50"
            }, function(result) {
                if (result.response) {
                    successCallback(result.response);
                } else {
                    rejectCallback(new Error('В процессе получения друзей произошла ошибка'));
                }
            });
        };

        this.prepareAllData = function(response) {
            //get User friends;
            new Promise(function(resolve, reject) {
                self.userId = response.session.mid;
                self.getUserList(response.session.mid, resolve, reject);

            }).then(function(friendList) {
            	var preparedFriendList,
            		savedList;
                if (friendList.length > 0) {
                    preparedFriendList = friendList.map(function(el) {
                        return new Friend(el);
                    });

                    if (localStorage[self.userId]) {
                    	savedList = localStorage[self.userId].split(',');
                    	preparedFriendList.forEach(function(el) {
                    		if (savedList.some(arrValue => el.userId === Number(arrValue))) {
                    			self.rightFriendList.push(el);
                    		} else {
                    			self.leftFriendList.push(el);
                    		}
                    	});
                    } else {
                    	self.leftFriendList = preparedFriendList;
                    }

                    document.getElementById(options.allFriendsContainerId).innerHTML = Mustache.render(document.getElementById(options.friendListTempateId).innerHTML, {
                        friends: self.leftFriendList
                    });

                    document.getElementById(options.selectedFriendsContainerId).innerHTML = Mustache.render(document.getElementById(options.selectedFriendListTempateId).innerHTML, {
                        friends: self.rightFriendList
                    });

                    Array.from(document.getElementById(options.allFriendsContainerId).children).forEach(function(el) {
                        self.leftFriendList.forEach(function(el2) {
                            if (el.getAttribute("data-user-id") == el2.userId) {
                                el2.htmlObject = el;
                                return true;
                            }
                        });
                    });

                    Array.from(document.getElementById(options.selectedFriendsContainerId).children).forEach(function(el) {
                        self.rightFriendList.forEach(function(el2) {
                            if (el.getAttribute("data-user-id") == el2.userId) {
                                el2.htmlObject = el;
                                return true;
                            }
                        });
                    });
                }
            }).catch(function(e) {
                alert(e.message);
            });
        };

        this.searchFriend = function(val, type) {
            var dataUser;
            if (type === 'left') {
                dataUser = this.leftFriendList;
            } else if (type === 'right') {
                dataUser = this.rightFriendList;
            }
            dataUser = dataUser.filter(function(el) {
                if (el.fullName.toLowerCase().indexOf(val.toLowerCase()) > -1) {
                    el.htmlObject.classList.remove('hide');
                    return true;
                } else {
                    el.htmlObject.classList.add('hide');
                    return false;
                }
            });
            return dataUser;
        };

        this.getFriendArrayIdByUserId = function(userId, type) {
            var searchArray;

            if (type === 'left') {
                searchArray = this.leftFriendList;
            } else if (type === 'right') {
                searchArray = this.rightFriendList;
            }
            for (var i = 0; searchArray.length; i++) {
                if (searchArray[i].userId == userId) {
                    return i;
                }
            }
            return null;
        };

        this.sortFriendArray = function(friendArray) {
            friendArray.sort(function(a, b) {
                if (a.fullName > b.fullName) {
                    return 1;
                } else {
                    return -1;
                }
                return 0;
            });
            return friendArray;
        };

        this.addElement = function(element, addRegion, searchField) {
            var indexArray = self.getFriendArrayIdByUserId(element.getAttribute('data-user-id'), 'left'),
                selectedElement,
                findedElements;
            if (typeof indexArray === 'number') {
                selectedElement = self.leftFriendList.splice(indexArray, 1)[0];
                self.rightFriendList.push(selectedElement);
                findedElements = self.searchFriend(searchField.value, 'right');
                self.sortFriendArray(self.rightFriendList).forEach(function(el) {
                    addRegion.appendChild(el.htmlObject);
                });
            }
        };

        this.removeElement = function(element, addRegion, searchField) {
            var indexArray = self.getFriendArrayIdByUserId(element.getAttribute('data-user-id'), 'right'),
                selectedElement,
                findedElements;
            if (typeof indexArray === 'number') {
                selectedElement = self.rightFriendList.splice(indexArray, 1)[0];
                self.leftFriendList.push(selectedElement);
                findedElements = self.searchFriend(searchField.value, 'left');
                self.sortFriendArray(self.leftFriendList).forEach(function(el) {
                    addRegion.appendChild(el.htmlObject);
                });
            }
        };

        this.addEvents = function() {
            var selectedListRegion = document.getElementById(options.selectedFriendsContainerId),
                allFriendListRegion = document.getElementById(options.allFriendsContainerId),
                friendApp = document.getElementById(options.friendAppId),
                yourFriends = document.getElementById(options.searchYourFriendsFieldId),
                selectedFriends = document.getElementById(options.searchSelectedFriendsFieldId),
                draggableElement;

            friendApp.addEventListener("click", function(e) {
                if (e.target.classList.contains("addFriend")) {
                    self.addElement(e.target, selectedListRegion, selectedFriends);
                    e.target.className = 'removeFriend glyphicon glyphicon-remove';
                } else if (e.target.classList.contains("removeFriend")) {
                    self.removeElement(e.target, allFriendListRegion, yourFriends);
                    e.target.className = 'addFriend glyphicon glyphicon-plus';
                }
            });

            yourFriends.addEventListener("keyup", function(e) {
                var searchObjects = self.searchFriend(this.value, 'left');
            });

            selectedFriends.addEventListener('keyup', function(e) {
                var searchObjects = self.searchFriend(this.value, 'right');
            });

            document.addEventListener('dragstart', function(e) {
                if (e.target.classList.contains('friend')) {
                    e.target.classList.add("moveClass");
                    draggableElement = e.target;
                } else if (e.target.classList.contains('img-circle')) {
                    e.preventDefault();
                }
            });

            document.addEventListener('dragover', function(e) {
                if (e.preventDefault) {
                    e.preventDefault();
                }

                e.dataTransfer.dropEffect = 'move';

                return false;
            });

            selectedListRegion.addEventListener('drop', function(e) {
                if (draggableElement && draggableElement.parentNode !== this) {
                    self.addElement(draggableElement, this, selectedFriends);
                    draggableElement.children[1].children[0].className = 'removeFriend glyphicon glyphicon-remove';
                }
            });

            allFriendListRegion.addEventListener('drop', function(e) {
                if (draggableElement && draggableElement.parentNode !== this) {
                    self.removeElement(draggableElement, this, yourFriends);
                    draggableElement.children[1].children[0].className = 'addFriend glyphicon glyphicon-plus';
                }
            });

            document.addEventListener('dragend', function(e) {
                if (e.target.classList.contains("friend")) {
                    e.target.classList.remove("moveClass");
                    draggableElement = "";
                }
            });

            document.getElementById(options.authButtonId).addEventListener('click', function(e) {
                new Promise(function(resolve, reject) {
                    self.authorize(resolve, reject);
                }).then(function(response) {
                    document.getElementById(options.authButtonId).classList.add('hide');
                    document.getElementById(options.friendAppId).classList.remove('hide');
                    self.prepareAllData(response);
                }).catch(function(e) {
                    alert(e.message);
                    document.getElementById(options.authButtonId).classList.remove('hide');
                    document.getElementById(options.friendAppId).classList.add('hide');
                });
            });

            document.getElementById(options.saveButtonId).addEventListener("click", function(e) {
            	localStorage[self.userId] = self.rightFriendList.map(function(el) {
            		return el.userId;
            	});
            	alert('Список успешно сохранен!');
            });

        };


        this.init = function() {
            this.addEvents();
        };
    };

    var options = {
            appId: 5379217,
            selectedFriendsContainerId: "selectedFriendsContainer",
            allFriendsContainerId: "allFriendsContainer",
            friendAppId: "friendApp",
            searchYourFriendsFieldId: "yourFriends",
            searchSelectedFriendsFieldId: "selectedFriends",
            friendListTempateId: "friendListTempate",
            selectedFriendListTempateId: "selectedFriendListTempate",
            authButtonId: "getFriendApp",
            saveButtonId: "saveResultButton"
        },
        friendFilter;

    new Promise(function(resolve) {
        if (document.readyState === "complete") {
            resolve();
        } else {
            window.onload = resolve;
        }
    }).then(function() {

        friendFilter = new FriendFilter(options);

        friendFilter.init();

        friendFilter.checkSession(function(response) {
            document.getElementById(options.authButtonId).classList.add('hide');
            document.getElementById(options.friendAppId).classList.remove('hide');
            friendFilter.prepareAllData(response);
        }, function(response) {
            document.getElementById(options.authButtonId).classList.remove('hide');
            document.getElementById(options.friendAppId).classList.add('hide');
        });
    }).catch(function(e) {
        alert(e.message);
    });

})();