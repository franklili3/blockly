$.withdraw = function(e, currency, address, amount, fee, password) {
    var withdraw_id = null;
    var ret = null;
    currency = currency.toLowerCase()
    switch (e.GetName()) {
        case "OKCoin_EN":
            ret = e.IO("api", "POST", "/api/v1/withdraw.do", "symbol="+currency.toLowerCase()+"_usd&chargefee=" + fee + "&trade_pwd=" + password + "&withdraw_address=" + address + "&withdraw_amount=" + amount);
            if (ret && typeof(ret.withdraw_id) !== 'undefined') {
                withdraw_id = ret.withdraw_id;
            } else {
                var err = GetLastError();
                if (err && err.indexOf('10031') !== -1) {
                    Log("OKCoin_EN 需6个网络确认后方能提现");
                }
            }
            break;
        case "Huobi":
            if (currency == "bch") {
                currency = "bcc"
            }
            ret = e.IO("api", "POST", "/v1/dw/withdraw-virtual/create", "currency="+currency+"&fee=" + fee + "&address=" + address + "&amount=" + amount);
            if (ret && typeof(ret.withdraw_id) !== 'undefined') {
                withdraw_id = ret.data;
            }
            break;
        case "Bithumb":
            ret = e.IO("api", "POST", "/trade/btc_withdrawal", "currency="+currency.toUpperCase()+"&address=" + address + "&units=" + amount);
            if (ret && parseInt(ret.status) == 0) {
                withdraw_id = 9999;
            }
            break;
        case "GateIO":
            ret = e.IO("api", "POST", "/api2/1/private/withdraw", "currency="+currency+"&address=" + address + "&amount=" + amount);
            if (ret && parseInt(ret.code) == 0) {
                withdraw_id = 9999;
            }
            break;
        case "ZB":
            ret = e.IO("api", "POST", "/api/withdraw", "method=withdraw&itransfer=0&currency="+currency+"&receiveAddr=" + address + "&amount=" + amount+"&fees="+fee+"&safePwd="+password);
            if (ret && parseInt(ret.code) == 0) {
                withdraw_id = ret.id;
            }
            break;
        case "Bitfinex":
            var cMap = {
                "btc": "bitcoin",
                "ltc": "litecoin",
                "eth": "ethereum",
                "etc": "ethereumc",
                "zec": "zcash",
                "xmr": "monero",
                "omni": "mastercoin",
                "usd": "wire",
                "dash": "dash",
                "xrp": "ripple",
                "eos": "eos"};
            if (typeof(cMap[currency]) == 'undefined') {
                throw "bitfinex not support " + currency;
            }
            var withdraw_type = cMap[currency];
            ret = e.IO("api", "POST", "/v1/withdraw", "withdraw_type=" + withdraw_type + "&walletselected=exchange&address=" + address + "&amount='" + amount + "'");
            if (ret && ret.length == 1 && typeof(ret[0].withdrawal_id) !== 'undefined') {
                withdraw_id = ret[0].withdrawal_id;
            }
            break;
        case "Poloniex":
            var ext = "";
            if (currency == 'xrp') {
                //ext = '&paymentId=' + PXRPLabel;
            }
            if (currency.toLowerCase() == 'bts' && address.indexOf('_') == -1) {
                address = "poloniexwallet_" + address;
            }
            ret = e.IO("api", "POST", "withdraw", "amount=" + amount + "&currency="+currency.toUpperCase()+"&address=" + address+ext);
            if (ret && ret.response.indexOf('With') !== -1) {
                withdraw_id = 9999;
            }
            break
        case "Bittrex":
            ret = e.IO("api", "GET", "/api/v1.1/account/withdraw", "quantity=" + amount + "&currency="+currency.toUpperCase()+"&address=" + address);
            if (ret && ret.success) {
                withdraw_id = ret.result.uuid;
            }
            break
        case "Binance":
            ret = e.IO("api", "POST", "/wapi/v1/withdraw.html", "amount=" + amount + "&asset=" + currency + "&address=" + address);
            if (ret && ret.success) {
                withdraw_id = 9999;
            }
            break
        case "OKEX":
            ret = e.IO("api", "POST", "/api/v1/withdraw.do", "target=address&withdraw_amount=" + amount + "&symbol="+currency+"_usd&withdraw_address=" + address+"&chargefee="+fee+"&trade_pwd="+password);
            if (ret && ret.result) {
                withdraw_id = ret.withdraw_id;
            }
            break
        default:
            throw "不支持的操作";
    }
    return {info: ret, withdraw_id: withdraw_id}
}

function CancelPendingOrders(e, orderType) {
    while (true) {
        var orders = e.GetOrders();
        if (!orders) {
            Sleep(RetryDelay);
            continue;
        }
        var processed = 0;
        for (var j = 0; j < orders.length; j++) {
            if (typeof(orderType) === 'number' && orders[j].Type !== orderType) {
                continue;
            }
            e.CancelOrder(orders[j].Id, orders[j]);
            processed++;
            if (j < (orders.length - 1)) {
                Sleep(RetryDelay);
            }
        }
        if (processed === 0) {
            break;
        }
    }
}

function GetAccount(e, waitFrozen) {
    if (typeof(waitFrozen) == 'undefined') {
        waitFrozen = false;
    }
    var account = null;
    var alreadyAlert = false;
    while (true) {
        account = _C(e.GetAccount);
        if (!waitFrozen || (account.FrozenStocks < MinStock && account.FrozenBalance < 0.01)) {
            break;
        }
        if (!alreadyAlert) {
            alreadyAlert = true;
            Log("发现账户有冻结的钱或币", account);
        }
        Sleep(RetryDelay);
    }
    return account;
}


function StripOrders(e, orderId) {
    var order = null;
    if (typeof(orderId) == 'undefined') {
        orderId = null;
    }
    while (true) {
        var dropped = 0;
        var orders = _C(e.GetOrders);
        for (var i = 0; i < orders.length; i++) {
            if (orders[i].Id == orderId) {
                order = orders[i];
            } else {
                var extra = "";
                if (orders[i].DealAmount > 0) {
                    extra = "成交: " + orders[i].DealAmount;
                } else {
                    extra = "未成交";
                }
                e.CancelOrder(orders[i].Id, orders[i].Type == ORDER_TYPE_BUY ? "买单" : "卖单", extra);
                dropped++;
            }
        }
        if (dropped === 0) {
            break;
        }
        Sleep(RetryDelay);
    }
    return order;
}

// mode = 0 : direct buy, 1 : buy as buy1
function Trade(e, tradeType, tradeAmount, mode, slidePrice, maxAmount, maxSpace, retryDelay) {
    var initAccount = GetAccount(e, true);
    var nowAccount = initAccount;
    var orderId = null;
    var prePrice = 0;
    var dealAmount = 0;
    var diffMoney = 0;
    var isFirst = true;
    var tradeFunc = tradeType == ORDER_TYPE_BUY ? e.Buy : e.Sell;
    var isBuy = tradeType == ORDER_TYPE_BUY;
    while (true) {
        var ticker = _C(e.GetTicker);
        var tradePrice = 0;
        if (isBuy) {
            tradePrice = _N((mode === 0 ? ticker.Sell : ticker.Buy) + slidePrice, ZPrecision);
        } else {
            tradePrice = _N((mode === 0 ? ticker.Buy : ticker.Sell) - slidePrice, ZPrecision);
        }
        if (!orderId) {
            if (isFirst) {
                isFirst = false;
            } else {
                nowAccount = GetAccount(e, true);
            }
            var doAmount = 0;
            if (isBuy) {
                diffMoney = _N(initAccount.Balance - nowAccount.Balance, ZPrecision);
                dealAmount = _N(nowAccount.Stocks - initAccount.Stocks, XPrecision);
                doAmount = Math.min(maxAmount, tradeAmount - dealAmount, _N(nowAccount.Balance / (tradePrice*(1+TradeFee)), XPrecision));
            } else {
                diffMoney = _N(nowAccount.Balance - initAccount.Balance, ZPrecision);
                dealAmount = _N(initAccount.Stocks - nowAccount.Stocks, XPrecision);
                doAmount = Math.min(maxAmount, tradeAmount - dealAmount, nowAccount.Stocks);
            }
            if (doAmount < MinStock) {
                break;
            }
            prePrice = tradePrice;
            orderId = tradeFunc(tradePrice, doAmount, ticker);
            if (!orderId) {
                CancelPendingOrders(e, tradeType);
            }
        } else {
            if (mode === 0 || (Math.abs(tradePrice - prePrice) > maxSpace)) {
                orderId = null;
            }
            var order = StripOrders(e, orderId);
            if (!order) {
                orderId = null;
            }
        }
        Sleep(retryDelay);
    }

    if (dealAmount <= 0) {
        return null;
    }

    return {
        price: _N(diffMoney / dealAmount, ZPrecision),
        amount: dealAmount
    };
}

$.Buy = function(e, amount) {
    if (typeof(e) === 'number') {
        amount = e;
        e = exchange;
    }
    return Trade(e, ORDER_TYPE_BUY, amount, OpMode, SlidePrice, MaxAmount, MaxSpace, RetryDelay);
};

$.Sell = function(e, amount) {
    if (typeof(e) === 'number') {
        amount = e;
        e = exchange;
    }
    return Trade(e, ORDER_TYPE_SELL, amount, OpMode, SlidePrice, MaxAmount, MaxSpace, RetryDelay);
};

$.CancelPendingOrders = function(e, orderType) {
    if (typeof(orderType) === 'undefined') {
        if (typeof(e) === 'number') {
            orderType = e;
            e = exchange;
        } else if (typeof(e) === 'undefined') {
            e = exchange;
        }
    }
    return CancelPendingOrders(e, orderType);
};

$.GetAccount = function(e) {
    if (typeof(e) === 'undefined') {
        e = exchange;
    }
    return _C(e.GetAccount);
};


// 返回上穿的周期数. 正数为上穿周数, 负数表示下穿的周数, 0指当前价格一样
$.Cross = function(a, b) {
    var pfnMA = [TA.EMA, TA.MA, talib.KAMA][MAType];
    var crossNum = 0;
    var arr1 = [];
    var arr2 = [];
    if (Array.isArray(a)) {
        arr1 = a;
        arr2 = b;
    } else {
        var records = null;
        while (true) {
            records = exchange.GetRecords();
            if (records && records.length > a && records.length > b) {
                break;
            }
            Sleep(RetryDelay);
        }
        arr1 = pfnMA(records, a);
        arr2 = pfnMA(records, b);
    }
    if (arr1.length !== arr2.length) {
        throw "array length not equal";
    }
    for (var i = arr1.length-1; i >= 0; i--) {
        if (typeof(arr1[i]) !== 'number' || typeof(arr2[i]) !== 'number') {
            break;
        }
        if (arr1[i] < arr2[i]) {
            if (crossNum > 0) {
                break;
            }
            crossNum--;
        } else if (arr1[i] > arr2[i]) {
            if (crossNum < 0) {
                break;
            }
            crossNum++;
        } else {
            break;
        }
    }
    return crossNum;
};