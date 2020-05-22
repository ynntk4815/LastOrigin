function p(){
    $('.tab_expedscorer .expedNumbers').html("");

    $.ajaxSetup({
        async: false
    });
    $.getJSON("explorations.json", function(data) {
        initExplorations(data.data);
    }).fail(function() {
        alert("test2");
    });

    $(".tab_expedscorer .expedNumBox")
        .filter(function(i,x){return $(x).hasClass("expedNumBox_"+(i));})
        .each(function(i,x){
            var
            row = $('.tab_expedscorer .factory .expedNum').clone().addClass("expedWhole").removeClass("expedNum"),
                val = true;
            $("input",".expedCheck .expedNumBox_"+(i)).each(function(id,elm){
                val&= $(elm).prop("checked");
            });
            $(row)
                .find(".expedCheck input")
                .attr("value", i)
                .prop("checked", val)
                .end()
                .find(".expedText")
                .text( "Ep " + (i) )
                .end()
                .find(".expedTime")
                .remove()
                .end()
                .find(".expedFixedCheck")
                .remove()
                .end();

            $(x).prepend(row);
        }).on("click", '.expedNum .expedCheck input', function(){
            var
            worldNum     = parseInt(idToEp($(this).attr("value"))),
                context      = ".tab_expedscorer .expedNumBox_"+worldNum,
                parentCheck  = true;
            self.exped_filters = [];
            $(".expedNum .expedCheck   input",context).each(function(i,x){ parentCheck &= $(x).prop("checked"); 
            });
            $(".expedWhole .expedCheck input",context).prop("checked",parentCheck);
        }).on("click", ".expedWhole .expedCheck input", function() {
            var
            worldNum = $(this).val(),
                state    = $(this).prop("checked"),
                expeds   = $(".tab_expedscorer .expedNumBox_"+worldNum+" .expedNum .expedCheck input");
            expeds.each(function(i,x){
                var
                elmState = $(x).prop("checked"),
                    expedNum = parseInt($(x).val());
                if(elmState ^ state) { // check different state
                    $(x).prop("checked",state);
                }
            });
        });

    // Calculate
    var resultTable = $('.tab_expedscorer .results tbody');
    $('.tab_expedscorer .calculate_btn').click(function(){
        var priorityPart = $(".tab_expedscorer .priorityPart").val() * 1;
        var priorityNutrient = $(".tab_expedscorer .priorityNutrient").val() * 1;
        var priorityPower = $(".tab_expedscorer .priorityPower").val() * 1;
        var afkHH = $(".tab_expedscorer .afkH").val() * 1;
        var afkMM = $(".tab_expedscorer .afkM").val() * 1;

        var afkTime = afkHH * 60 + afkMM;

        var selectedItemsQ = $('.tab_expedscorer .expedNumBox .expedNum .expedCheck input:checked');

        var selectedItems = [];
        selectedItemsQ.each( function() {
            selectedItems.push($(this).attr("value"));
        });

        var selectedFixedItemsQ = $('.tab_expedscorer .expedNumBox .expedNum .expedFixedCheck input:checked');

        var selectedFixedItems = [];
        selectedFixedItemsQ.each( function() {
            selectedFixedItems.push($(this).attr("value"));
        });

        var fleetCount = parseInt( $(".tab_expedscorer .fleetCounts input:checked").val(), 10);

        var results = calcWithExpeditionIdsFleetCountJS(fleetCount, priorityPart, priorityNutrient, priorityPower, selectedItems, afkTime,
                selectedFixedItems);

        resultTable.empty();
        for (var i = 0; i < results.length && i < 50; ++i) {
            var curVal = results[i];
            var row = $('<tr></tr>');
            $('<td></td>').text(curVal.eIds).appendTo(row);
            $('<td></td>').text(curVal.part.toFixed(0)).appendTo(row);
            $('<td></td>').text(curVal.nutrient.toFixed(0)).appendTo(row);
            $('<td></td>').text(curVal.power.toFixed(0)).appendTo(row);
            $('<td></td>').text(curVal.resourceScore.toFixed(0)).appendTo(row);
            $('<td></td>').text(curVal.resourceSum.toFixed(0)).appendTo(row);
            resultTable.append( row );
        }

        var unitTimes = $(".tab_expedscorer .results .unitTime");
        unitTimes.each(function() {
            var str = "hr";
            if (afkTime > 0) {
                str = afkHH + "h" + afkMM + "m";
            }
            $(this).empty();
            $(this).append(str);
        });
    });
}

function compare(a,b) {
    if (a.resourceScore < b.resourceScore)
        return 1;
    if (a.resourceScore > b.resourceScore)
        return -1;
    if (a.resourceScore == b.resourceScore) {
        if (a.resourceSum < b.resourceSum)
            return 1;
        if (a.resourceSum > b.resourceSum)
            return -1;
    }
    return 0;
}

function idToEp(id) {
    return parseInt((1 * id - 1) / 8) + 1;
}

function getExpedMinutesTime(exped) {
    return 60 * exped.time.h + 1 * exped.time.m;
}

function calcWithExpeditionIdsFleetCountJS(fleetCount, priorityPart, priorityNutrient, priorityPower, selectedItems, afkTime,
        selectedFixedItems) {
    var expeds = [];
    var result = [];

    $.ajaxSetup({
        async: false
    });
    $.getJSON("explorations.json", function(data) {
        $.each(data.data, function(key, val) {
            expeds.push(val);
        });
    }).fail(function() {
        alert("test2");
    });

    //var ids = [];
    //expeds.forEach(function(val) {
    //    ids.push(val.id);
    //});

    var perUnitTime = 60;
    var ids = selectedItems;
    if (afkTime > 0) {
        ids = [];
        selectedItems.forEach(function(val) {
            var grepList = $.grep(expeds, function(e){ return e.id == val; });
            var exped = grepList[0];

            var expedTime = getExpedMinutesTime(exped);
            if (getExpedMinutesTime(exped) > afkTime) {
                if (expedTime % afkTime == 0) {
                    ids.push(val);
                } else {
                    //ids.push(val);
                }
            } else {
                ids.push(val);
            }
        });
    }

    ids = $(ids).not(selectedFixedItems).get();
    idset = combine(ids, fleetCount - selectedFixedItems.length, selectedFixedItems);
    idset.forEach(function(val) {
        var eCombine = {};
        eCombine.eIds = "";
        eCombine.part = 0.0;
        eCombine.nutrient = 0.0;
        eCombine.power = 0.0;
        eCombine.resourceScore = 0.0;
        eCombine.resourceSum = 0.0;
        tIds = [];
        for (var i = 0; i < val.length; ++i) {
            var grepList = $.grep(expeds, function(e){ return e.id == val[i]; });
            var exped = grepList[0];
            tIds.push(exped.stage.main + "-" + exped.stage.sub);

            var incomePart = 0;
            var incomeNutrient = 0;
            var incomePower = 0;

            var expedTime = getExpedMinutesTime(exped);

            if (afkTime > 0) {
                if (getExpedMinutesTime(exped) > afkTime) {
                    incomePart = exped.part / expedTime * afkTime;
                    incomeNutrient = exped.nutrient / expedTime * afkTime;
                    incomePower = exped.power / expedTime * afkTime;
                } else {
                    incomePart = exped.part;
                    incomeNutrient = exped.nutrient;
                    incomePower = exped.power;
                }
            } else {
                incomePart = exped.part / expedTime * perUnitTime;
                incomeNutrient = exped.nutrient / expedTime * perUnitTime;
                incomePower = exped.power / expedTime * perUnitTime;
            }

            eCombine.part += incomePart;
            eCombine.nutrient += incomeNutrient;
            eCombine.power += incomePower;

            eCombine.resourceSum += incomePart;
            eCombine.resourceSum += incomeNutrient;
            eCombine.resourceSum += incomePower;
            eCombine.resourceScore += incomePart * priorityPart;
            eCombine.resourceScore += incomeNutrient * priorityNutrient;
            eCombine.resourceScore += incomePower * priorityPower;
        }

        eCombine.eIds = tIds.join(", ");
        result.push(eCombine);
    });

    result.sort(compare);
    return result;
}

function combine(elements, combineLength, selectedFixedItems) {
    var list = [];

    if (combineLength <= 0) {
        list.push(selectedFixedItems)
        return list;
    }

    for (var i = 0; i < elements.length - combineLength + 1; ++i) {
        if (combineLength == 1) {
            var t = [];
            t = t.concat(selectedFixedItems);
            t.push(elements[i]);
            list.push(t);
        } else {
            ll = combine(elements.slice(i + 1, elements.length), combineLength - 1, selectedFixedItems);
            ll.forEach(function(val) {
                val.splice(selectedFixedItems.length, 0, elements[i]);
            });
            list = list.concat(ll);
        }
    }

    return list;
}

function initExplorations(explorations) {
    var stageMainMax = 0;
    explorations.forEach(function(val) {
        if (val.stage.main > stageMainMax) stageMainMax = val.stage.main;
    });

    $('<div></div>').addClass("xhidden expedNumBox expedNumBox_" + 0).appendTo("#expedNumBoxContainer")
    for (var i = 1; i <= stageMainMax; ++i) {
        $('<div></div>').addClass("expedNumBox expedNumBox_" + i).appendTo("#expedNumBoxContainer")
    }

    explorations.forEach(function(val) {
        var row = $('.tab_expedscorer .factory .expedNum').clone();
        $(".expedCheck input", row).attr("value", val.id);
        $(".expedFixedCheck input", row).attr("value", val.id);
        $(".expedText", row).text(val.stage.main + "-" + val.stage.sub);
        $(".expedTime", row).text(val.time.h + ":" + ("0" + val.time.m).slice(-2));

        var boxNum = val.stage.main
        $(".tab_expedscorer .expedNumBox_"+boxNum).append(row);
    });
}
