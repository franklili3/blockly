[{
    "type": "ext_Trade",
    "message0": "1%1 币数 %2|%1 Coins %2",
    "args0": [{
        "type": "field_dropdown",
        "options": [
            ["买入|Buy", "Buy"],
            ["卖出|Sell", "Sell"]
        ]
    }, {
        "type": "input_value",
        "check": "Number"
    }],
    "template": "(function(){var r = $.%1(%2); return r ? r.amount : 0; })()",
    "order": "ORDER_ATOMIC",
    "output": "Number",
    "colour": 85
}, {
    "type": "ext_CancelPendingOrders",
    "message0": "1取消 %1 订单|Cancel %1 Orders",
    "args0": [{
        "type": "field_dropdown",
        "name": "TYPE",
        "options": [
            ["所有|All", " "],
            ["买单|Buy", "ORDER_TYPE_BUY"],
            ["卖单|Sell", "ORDER_TYPE_SELL"]
        ]
    }],
    "previousStatement": null,
    "nextStatement": null,
    "template": "$.CancelPendingOrders(%1);",
    "colour": 85
}, {
    "type": "ext_Cross",
    "message0": "1计算交叉 周期 %1 与 %2|Cross Period %1 and %2",
    "inputsInline": true,
    "args0": [{
        "type": "input_value"
    }, {
        "type": "input_value"
    }],
    "template": "$.Cross(%1,%2)",
    "order": "ORDER_ATOMIC",
    "output": "Number"
}, {
    "type": "ext_GetAccount",
    "message0": "1获取资产信息|GetAccount",
    "template": "$.GetAccount()",
    "order": "ORDER_ATOMIC",
    "output": null
}]