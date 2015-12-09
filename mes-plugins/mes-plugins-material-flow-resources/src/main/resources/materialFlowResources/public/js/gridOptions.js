/*
 * jQuery resize event - v1.1 - 3/14/2010
 * http://benalman.com/projects/jquery-resize-plugin/
 * 
 * Copyright (c) 2010 "Cowboy" Ben Alman
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */
(function ($, h, c) {
    var a = $([]), e = $.resize = $.extend($.resize, {}), i, k = "setTimeout", j = "resize", d = j + "-special-event", b = "delay", f = "throttleWindow";
    e[b] = 250;
    e[f] = true;
    $.event.special[j] = {setup: function () {
            if (!e[f] && this[k]) {
                return false
            }
            var l = $(this);
            a = a.add(l);
            $.data(this, d, {w: l.width(), h: l.height()});
            if (a.length === 1) {
                g()
            }
        }, teardown: function () {
            if (!e[f] && this[k]) {
                return false
            }
            var l = $(this);
            a = a.not(l);
            l.removeData(d);
            if (!a.length) {
                clearTimeout(i)
            }
        }, add: function (l) {
            if (!e[f] && this[k]) {
                return false
            }
            var n;
            function m(s, o, p) {
                var q = $(this), r = $.data(this, d);
                r.w = o !== c ? o : q.width();
                r.h = p !== c ? p : q.height();
                n.apply(this, arguments)
            }
            if ($.isFunction(l)) {
                n = l;
                return m
            } else {
                n = l.handler;
                l.handler = m
            }
        }};
    function g() {
        i = h[k](function () {
            a.each(function () {
                var n = $(this), m = n.width(), l = n.height(), o = $.data(this, d);
                if (m !== o.w || l !== o.h) {
                    n.trigger(j, [o.w = m, o.h = l])
                }
            });
            g()
        }, e[b])
    }}
)(jQuery, this);

var myApp = angular.module('gridApp', []);

myApp.directive('ngJqGrid', function ($window) {
    return {
        restrict: 'E',
        scope: {
            config: '=',
            data: '=',
        },
        link: function (scope, element, attrs) {
            var table;

            scope.$watch('config', function (newValue) {
                element.children().empty();
                table = angular.element('<table id="grid"></table>');
                element.append(table);
                element.append(angular.element('<div id="jqGridPager"></div>'));
                $(table).jqGrid(newValue);

                var addNewRowButton = '<input type="image" src="/qcadooView/public/img/core/icons/newIcon24.png" alt="Add new row" id="add_new_row" />';
                $(addNewRowButton).bind('click', scope.addNewRow);
                $('#t_grid').append(addNewRowButton);

                $(table).jqGrid('filterToolbar');

                $(table).navGrid('#jqGridPager',
                        // the buttons to appear on the toolbar of the grid
                                {edit: true, add: true, del: true, search: false, refresh: false, view: false, position: "left", cloneToTop: false},
                        // options for the Edit Dialog
                        {
                            ajaxEditOptions: {contentType: "application/json"},
                            mtype: 'PUT',
                            closeAfterEdit: true,
                            serializeEditData: function (data) {
                                delete data.oper;
                                return JSON.stringify(data);
                            },
                            onclickSubmit: function (params, postdata) {
                                params.url = '../../integration/rest/documentPositions/' + postdata.grid_id + ".html";
                            },
                            errorTextFormat: function (response) {
                                return JSON.parse(response.responseText).message;
                            }
                        },
                        // options for the Add Dialog
                        {
                            ajaxEditOptions: {contentType: "application/json"},
                            mtype: "PUT",
                            resize: false,
                            drag: false,
                            top: 100,
                            left: function () {
                                return $(window).width() / 2 - 250;
                            },
                            width: 500,
                            closeAfterEdit: true,
                            reloadAfterSubmit: true,
                            serializeEditData: function (data) {
                                delete data.oper;
                                delete data.id;
                                return JSON.stringify(data);
                            },
                            onclickSubmit: function (params, postdata) {
                                params.url = '../../integration/rest/documentPositions.html';
                            },
                            errorTextFormat: function (response) {
                                return JSON.parse(response.responseText).message;
                            }
                        },
                        // options for the Delete Dailog
                        {
                            mtype: "DELETE",
                            serializeDelData: function () {
                                return ""; // don't send and body for the HTTP DELETE
                            },
                            onclickSubmit: function (params, postdata) {
                                params.url = '../../integration/rest/documentPositions/' + encodeURIComponent(postdata) + ".html";
                            },
                            errorTextFormat: function (response) {
                                return JSON.parse(response.responseText).message;
                            }
                        });
                    });

            scope.$watch('data', function (newValue, oldValue) {
                var i;
                for (i = oldValue.length - 1; i >= 0; i--) {
                    $(table).jqGrid('delRowData', i);
                }
                for (i = 0; i < newValue.length; i++) {
                    $(table).jqGrid('addRowData', i, newValue[i]);
                }
            });
        }
    };
});

myApp.controller('GridController', ['$scope', '$window', '$http', function ($scope, $window, $http) {
        var _this = this;
        var lookupWindow;
        var productIdElement;

        var messagesController = new QCD.MessagesController();

        function showMessage(message) {
            messagesController.addMessage(message);
        }

        function getContextParamFromUrl() {
            var query = location.search.substr(1);
            var context = {};
            query.split("&").forEach(function (part) {
                var item = part.split("=");
                context[item[0]] = decodeURIComponent(item[1]);
            });

            context = JSON.parse(context.context);

            return context;
        }

        function validatePositive(value, column) {
            if (isNaN(value) && value < 0)
                return [false, "Please enter a positive value"];
            else
                return [true, ""];
        }

        this.onGridLinkClicked = function (entityId) {
            var grid = lookupWindow.mainController.getComponent("window.mainTab.grid");
//		var lookupData = grid.getLookupData(entityId);
            productIdElement.val(entityId);
            mainController.closeThisModalWindow();
        }

        function onModalClose() {
            lookupWindow = null;
        }

        function onModalRender(modalWindow) {
            modalWindow.getComponent("window.mainTab.grid").setLinkListener(_this);
        }

        function editProductId_openLookup() {
            lookupWindow = mainController.openModal('body', 'materialFlowResources/productsLookup.html', null, onModalClose, onModalRender, {width: 1000, height: 560})
        }

        function createLookupElement(inputId, value, url) {
            var $ac = $('<input id="' + inputId + '" class="eac-square"/>');
            $ac.val(value);
            $ac.autoComplete({
                source: function (query, response) {
                    try {
                        xhr.abort();
                    } catch (e) {
                    }
                    xhr = $.getJSON(url, {query: query}, function (data) {
                        response(data);
                    });
                },
                renderItem: function (item, search) {
                    var code = item.code || item.number;
                    var id = item.id;
                    // escape special characters
                    search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    var re = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
                    return '<div class="autocomplete-suggestion" data-id="' + id + '" data-val="' + code + '">' + code.replace(re, "<b>$1</b>") + '</div>';
                },
                onSelect: function (e, term, item) {
                }
            });

//            var button = $('<button>Szukaj</button>');
//            button.bind('click', function () {
//                editProductId_openLookup();
//            });
//            button.insertAfter($ac);

            return $ac;
        }

        function storageLocationLookup_createElement(value, options) {
            return createLookupElement('storageLocation', value, '/integration/rest/documentPositions/storagelocations.html');
        }

        function palletNumbersLookup_createElement(value, options) {
            return createLookupElement('palletnumber', value, '/rest/palletnumbers');
        }

        function productsLookup_createElement(value, options) {
            var lookup = createLookupElement('square', value, '/rest/products');

            $(lookup).bind('change keydown paste input', function () {
                var t = $(this);
                window.clearTimeout(t.data("timeout"));
                $(this).data("timeout", setTimeout(function () {
                    $.get('/integration/rest/documentPositions/unit/' + t.val() + ".html", function (data) {
                        var gridData = $('#grid').jqGrid('getRowData');
                        var pattern = /(id=\".+_unit\")/ig;
                        for (var j = 0; j < gridData.length; j++) {
                            var unit = gridData[j]['unit'];
                            if (unit.toLowerCase().indexOf('<input') >= 0) {
                                var matched = unit.match(pattern)[0];
                                var numberOfInput = matched.toUpperCase().replace("ID=\"", "").replace("_UNIT\"", "");
                                unit = $('#' + numberOfInput + '_unit').val(data);
                            }
                        }
                    });

                }, 500));
            });
            return lookup;
        }

        function additionalCodeLookup_createElement(value, options) {
            return createLookupElement('additionalCode', value, '/rest/additionalcodes');
        }

        function lookup_value(elem, operation, value) {
            if (operation === 'get') {
                return $(elem).val();

            } else if (operation === 'set') {
                $('input', elem).val(value);
            }
        }

        function errorfunc(rowID, response) {
            showMessage({
                type: "failure",
                content: JSON.parse(response.responseText).message
            });

            return true;
        }

        function successfunc(rowID, response) {
            showMessage({
                type: 'success',
                content: QCD.translate('qcadooView.message.saveMessage')
            });

            return true;
        }

        function errorCallback(response) {
            showMessage({
                type: "failure",
                content: response.data.message
            });
        }

        function aftersavefunc() {
            $("#grid").trigger("reloadGrid");
        }

        $scope.resize = function () {
            console.log('resize');
            jQuery('#grid').setGridWidth($("#window\\.positionsGridTab").width() - 20, true);
            jQuery('#grid').setGridHeight($("#window\\.positionsGridTab").height() - 200);
        }
        $("#window\\.positionsGridTab").resize($scope.resize);

        var gridEditOptions = {
            keys: true,
            url: '../../integration/rest/documentPositions.html',
            mtype: 'PUT',
            errorfunc: errorfunc,
            successfunc: successfunc,
            aftersavefunc: aftersavefunc
        };

        var gridAddOptions = {
            rowID: "0",
            initdata: {
            },
            position: "first",
            useDefValues: true,
            useFormatter: false,
            addRowParams: angular.extend({
                extraparam: {}
            }, gridEditOptions)
        };

        var config = {
            url: '../../integration/rest/documentPositions/' + getContextParamFromUrl()['form.id'] + '.html',
            datatype: "json",
            height: '100%',
            autowidth: true,
            rowNum: 150,
            sortname: 'id',
            toolbar: [true, "top"],
            errorTextFormat: function (response) {
                return JSON.parse(response.responseText).message;
            },
            colNames: ['ID', 'document', 'product', 'additional_code', 'quantity', 'unit', 'givenquantity', 'givenunit', 'conversion', 'expirationdate',
                'pallet', 'type_of_pallet', 'storage_location'/*, 'resource_id'*/],
            colModel: [
                {
                    name: 'id',
                    index: 'id',
                    key: true,
                    hidden: true
                },
                {
                    name: 'document',
                    index: 'document',
                    hidden: true,
                    editable: true,
                    editoptions: {
                        defaultValue: getContextParamFromUrl()['form.id']
                    }

                },
                {
                    name: 'product',
                    index: 'product',
                    editable: true,
                    required: true,
                    edittype: 'custom',
                    editoptions: {
                        custom_element: productsLookup_createElement,
                        custom_value: lookup_value,
                    }
                },
                {
                    name: 'additional_code',
                    index: 'additional_code',
                    editable: true,
                    required: true,
                    edittype: 'custom',
                    editoptions: {
                        custom_element: additionalCodeLookup_createElement,
                        custom_value: lookup_value
                    }
                },
                {
                    name: 'quantity',
                    index: 'quantity',
                    editable: true,
                    required: true,
                    formatter: 'number',
                    editrules: {
                        custom_func: validatePositive,
                        custom: true,
                        required: false
                    },
                },
                {
                    name: 'unit',
                    index: 'unit',
                    editable: true,
                    editoptions: {readonly: 'readonly'},
                    width: 60
                },
                {
                    name: 'givenquantity',
                    index: 'givenquantity',
                    editable: true,
                    required: true,
                    formatter: 'number',
                    editrules: {
                        custom_func: validatePositive,
                        custom: true,
                        required: false
                    },
                },
                {
                    name: 'givenunit',
                    index: 'givenunit',
                    editable: true,
                    required: true,
                    edittype: 'select',
                    editoptions: {
                        aysnc: false,
                        dataUrl: '../../rest/units',
                        buildSelect: function (response) {
                            var data = $.parseJSON(response);
                            var s = "<select>";

                            s += '<option value="0">--</option>';
                            $.each(data, function () {
                                s += '<option value="' + this.key + '">' + this.value + '</option>';
                            });

                            return s + "</select>";
                        }
                    },
                },
                {
                    name: 'conversion',
                    index: 'conversion',
                    editable: true,
                    required: true,
                },
                {
                    name: 'expirationdate',
                    index: 'expirationdate',
                    width: 150,
                    editable: true,
                    required: true,
                    edittype: "text",
                    editoptions: {
                        dataInit: function (element) {
                            var options = $.datepicker.regional[window.locale];
                            options.showOn = 'focus';

                            $(element).datepicker(options);
                        }
                    }
                },
                {
                    name: 'pallet',
                    index: 'pallet',
                    editable: true,
                    required: true,
                    edittype: 'custom',
                    editoptions: {
                        custom_element: palletNumbersLookup_createElement,
                        custom_value: lookup_value
                    }
                },
                {
                    name: 'type_of_pallet',
                    index: 'type_of_pallet',
                    editable: true,
                    required: true,
                    edittype: 'select',
                    editoptions: {
                        aysnc: false,
                        dataUrl: '../../rest/typeOfPallets',
                        buildSelect: function (response) {
                            var data = $.parseJSON(response);
                            var s = "<select>";

                            s += '<option value="0">--</option>';
                            $.each(data, function () {
                                s += '<option value="' + this.key + '">' + this.value + '</option>';
                            });

                            return s + "</select>";
                        }
                    }
                },
                {
                    name: 'storage_location',
                    index: 'storage_location',
                    editable: true,
                    edittype: 'custom',
                    editoptions: {
                        custom_element: storageLocationLookup_createElement,
                        custom_value: lookup_value
                    }
                }/*,
                 {
                 name: 'resource_id',
                 index: 'resource_id',
                 editable: true,
                 edittype: 'custom',
                 editoptions: {
                 // TODO
                 custom_element: editProductId_createElement,
                 custom_value: editProductId_value
                 }
                 }*/
            ],
            pager: "#jqGridPager",
            gridComplete: function () {
                //setTimeout(function() { $scope.resize(); }, 1000);                
            },
            onSelectRow: function (id) {
                gridEditOptions.url = '../../integration/rest/documentPositions/' + id + '.html';
                jQuery('#grid').editRow(id, gridEditOptions);
            },
            ajaxRowOptions: {contentType: "application/json"},
            serializeRowData: function (postdata) {
                delete postdata.oper;
                return JSON.stringify(postdata);
            },
            beforeSubmit: function (postdata, formid) {
                //more validations
//                if ($('#exec').val() == "") {
//                    $('#exec').addClass("ui-state-highlight");
//                    return [false, 'ERROR MESSAGE']; //error
//                }
                return [false, 'ble']; 
            }
        };

        prepareGridConfig(config);

        function prepareGridConfig(config) {
            $http({
                method: 'GET',
                url: '../../integration/rest/documentPositions/gridConfig.html'

            }).then(function successCallback(response) {
                angular.forEach(config.colModel, function (value, key) {
                    if (value.index === 'storage_location' && !response.data.showstoragelocation) {
                        config.colModel[key].hidden = true;
                        config.colModel[key].editrules = config.colModel[key].editrules || {};
                        config.colModel[key].editrules.edithidden = true;
                    }
                });

                angular.forEach(config.colNames, function (value, key) {
                    config.colNames[key] = QCD.translate('qcadooView.gridColumn.' + value);
                });

                $http({
                    method: 'GET',
                    url: '../../rest/units'

                }).then(function successCallback(response) {
                    var selectOptionsUnits = [];
                    angular.forEach(response.data, function (value, key) {
                        selectOptionsUnits[value.key] = value.value;
                    });

                    config.colModel.filter(function (element, index) {
                        return element.index === 'givenunit';
                    })[0].editoptions.value = selectOptionsUnits;

                    $http({
                        method: 'GET',
                        url: '../../rest/typeOfPallets'

                    }).then(function successCallback(response) {
                        selectOptionsTypeOfPallets = [];
                        angular.forEach(response.data, function (value, key) {
                            selectOptionsTypeOfPallets[value.key] = value.value;
                        });

                        config.colModel.filter(function (element, index) {
                            return element.index === 'type_of_pallet';
                        })[0].editoptions.value = selectOptionsTypeOfPallets;

                        $scope.config = config;

                    }, errorCallback);

                }, errorCallback);

            }, errorCallback);

            return config;
        }

        $scope.data = [];

        $scope.addNewRow = function () {
            jQuery('#grid').addRow(gridAddOptions);
        }
    }]);
