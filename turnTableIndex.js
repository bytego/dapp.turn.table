'use strict'
var HttpRequest = require("nebulas").HttpRequest;
var Neb = require("nebulas").Neb;
var Account = require("nebulas").Account;
var account = null;
var keyfile = null;
var Transaction = require("nebulas").Transaction;
var neb = new Neb();

//测试网
// neb.setRequest(new HttpRequest("https://testnet.nebulas.io"));
// var contractAddress = "n221dc3Xp66hpFxtB9D8ft7ju5EDPyDEvMB";
// var chainid = 1001;

//主网
neb.setRequest(new HttpRequest("https://mainnet.nebulas.io"));
var contractAddress = "n1iaXmodaw3Nbwqg4ViJjjhuCNA2exKBwxi";
var chainid = 1;

$('#keyfile').change(function (e) {
    var $this = $(this), file = e.target.files[0], fr = new FileReader();
    fr.onload = onload;
    fr.readAsText(file);

    function onload(e) {
        try {
            keyfile = JSON.parse(e.target.result);
            $('#keyfilepassworddiv').show();
        } catch (e) {
            Materialize.toast(e, 3000);
            return;
        }
    }
});

function unlock(e) {
    Materialize.toast('正在查询钱包信息', 3000);
    account = new Account();
    try {
        account.fromKey(keyfile, $('#keyfilepassword')[0].value.trim());
    } catch (e) {
        Materialize.toast(e, 3000);
        return;
    }
    $('#address').text(account.getAddressString());
    neb.api.getAccountState({address: account.getAddressString()}).then(function (state) {
        $('#balance').text(state.balance / 1e18 + ' NAS');
        Materialize.toast('钱包余额查询成功', 3000);

        balanceOf();
        getContractBalance();
        getUserCount();
        getAllUser();

    });
}

//智能合约充值
function reCharge() {

    var amount = $("#reCharge_number").val();

    if(amount < 0.001){
        Materialize.toast('充值金额金额0.001NAS起', 2000);
        return;
    }

    neb.api.call({
        chainID: chainid,
        from: account.getAddressString(),
        to: contractAddress,
        value: amount * 1e18,
        nonce: 0,
        gasPrice: 1000000,
        gasLimit: 2000000,
        contract: {function: "reCharge", args: ""}
    }).then(function (call) {
        if (call.execute_err === '') {
            neb.api.getAccountState({address: account.getAddressString()}).then(function (state) {
                $('#balance').text(state.balance / 1e18 + ' NAS');
                Materialize.toast('个人钱包余额更新成功', 2000);

                var tx = new Transaction({
                    chainID: chainid,
                    from: account,
                    to: contractAddress,
                    value: amount * 1e18,
                    nonce: parseInt(state.nonce) + 1,
                    gasPrice: 1000000,
                    gasLimit: 2000000,
                    contract: {function: "reCharge", args: ""}
                });
                tx.signTransaction();
                neb.api.sendRawTransaction({data: tx.toProtoString()}).then(function (tx) {

                    Materialize.toast('区块打包中，15秒后自动刷新,或者手动刷新', 5000);
                    setTimeout("queryInfoAuto()","20000");
                });
            });
        } else {
            Materialize.toast(call.execute_err, 3000);
        }
    });
}

//用户在智能合约的个人余额
function balanceOf() {

    neb.api.call({
        chainID: chainid,
        from: account.getAddressString(),
        to: contractAddress,
        value: 0,
        nonce: 0,
        gasPrice: 1000000,
        gasLimit: 2000000,
        contract: {function: "balanceOf", args: ""}
    }).then(function (data) {
        var result = JSON.parse(data.result);

        Materialize.toast('游戏账户个人余额更新成功', 2000);

        var balance = 0;
        if(result){
            balance = result.balance;
        }

        $('#contract_balance').text(balance/1e18 + 'NAS');
        $('#contract_balance_input').val(balance/1e18);

    });

}

//获取智能合约的余额
function getContractBalance() {

    neb.api.call({
        chainID: chainid,
        from: account.getAddressString(),
        to: contractAddress,
        value: 0,
        nonce: 0,
        gasPrice: 1000000,
        gasLimit: 2000000,
        contract: {function: "getContractBalance", args: ""}
    }).then(function (data) {
        var result = JSON.parse(data.result);

        Materialize.toast('智能合约奖金池更新成功', 2000);
        $('#current_contract_balance').text(result/1e18 + 'NAS');
    });

}

//抽奖后处理
function afterAward(value) {

    neb.api.call({
        chainID: chainid,
        from: account.getAddressString(),
        to: contractAddress,
        value: 0,
        nonce: 0,
        gasPrice: 1000000,
        gasLimit: 2000000,
        contract: {function: "afterAward", args: JSON.stringify([value * 1e18])}
    }).then(function (call) {
        if (call.execute_err === '') {
            neb.api.getAccountState({address: account.getAddressString()}).then(function (state) {
                $('#balance').text(state.balance / 1e18 + ' NAS');

                var tx = new Transaction({
                    chainID: chainid,
                    from: account,
                    to: contractAddress,
                    value: 0,
                    nonce: parseInt(state.nonce) + 1,
                    gasPrice: 1000000,
                    gasLimit: 2000000,
                    contract: {function: "afterAward", args: JSON.stringify([value * 1e18])}
                });
                tx.signTransaction();
                neb.api.sendRawTransaction({data: tx.toProtoString()}).then(function (tx) {
                });

                Materialize.toast('区块打包中，15秒后自动刷新,或者手动刷新', 5000);
                setTimeout("queryInfoAuto()","20000");

            });
        } else {
            Materialize.toast(call.execute_err, 3000);
        }
    });
}


//提现所有
function withDrawAll() {

    neb.api.call({
        chainID: chainid,
        from: account.getAddressString(),
        to: contractAddress,
        value: 0,
        nonce: 0,
        gasPrice: 1000000,
        gasLimit: 2000000,
        contract: {function: "withDrawAll", args: ""}
    }).then(function (call) {
        if (call.execute_err === '') {
            neb.api.getAccountState({address: account.getAddressString()}).then(function (state) {
                $('#balance').text(state.balance / 1e18 + ' NAS');
                Materialize.toast('个人钱包余额更新成功', 2000);

                var tx = new Transaction({
                    chainID: chainid,
                    from: account,
                    to: contractAddress,
                    value: 0,
                    nonce: parseInt(state.nonce) + 1,
                    gasPrice: 1000000,
                    gasLimit: 2000000,
                    contract: {function: "withDrawAll", args: ""}
                });
                tx.signTransaction();
                neb.api.sendRawTransaction({data: tx.toProtoString()}).then(function (tx) {
                });

                Materialize.toast('区块打包中，15秒后自动刷新,或者手动刷新', 5000);
                setTimeout("queryInfoAuto()","20000");

            });
        } else {
            Materialize.toast(call.execute_err, 3000);
        }
    });

}

//获取所有用户信息
function getAllUser() {

    neb.api.call({
        chainID: chainid,
        from: account.getAddressString(),
        to: contractAddress,
        value: 0,
        nonce: 0,
        gasPrice: 1000000,
        gasLimit: 2000000,
        contract: {function: "getAllUser", args: ""}
    }).then(function (data) {
        var result = JSON.parse(data.result);

        console.log(result);

        var ul_txt = '';
        result.forEach(function (re,i) {
            console.log(result[i]);

            ul_txt += '<li>' + result[i] + '</li>';
        })

        $('#getAllUser').html(ul_txt);
    });
}

//当前参与人数
function getUserCount() {

    neb.api.call({
        chainID: chainid,
        from: account.getAddressString(),
        to: contractAddress,
        value: 0,
        nonce: 0,
        gasPrice: 1000000,
        gasLimit: 2000000,
        contract: {function: "getUserCount", args: ""}
    }).then(function (data) {
        var result = JSON.parse(data.result);

        console.log(result);

        $('#getUserCount').text(result + '人');
    });
}


function test() {

    var result = [];
    result.push(111);
    result.push(222);

    console.log(result);

    result.forEach(function (re,i) {

        console.log(result[i]);

    })

}

//自动刷新
function queryInfoAuto() {

    balanceOf();
    getContractBalance();
    getUserCount();
    getAllUser();
};

//手动刷新
function queryInfo() {

    Materialize.toast('手动刷新，没有到账，请重试', 2000);

    balanceOf();
    getContractBalance();
    getUserCount();
    getAllUser();
};