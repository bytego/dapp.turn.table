'use strict'
var HttpRequest = require("nebulas").HttpRequest;
var Neb = require("nebulas").Neb;
var Account = require("nebulas").Account;
var account = null;
var keyfile = null;
var Transaction = require("nebulas").Transaction;
var neb = new Neb();
// neb.setRequest(new HttpRequest("https://testnet.nebulas.io"));
neb.setRequest(new HttpRequest("https://testnet.nebulas.io"));

//星云大转盘智能合约
//测试网
var contractAddress = "n1smvuknBYQmbPKs8eEpQb7DhHbaw7Wfd9y";
var chainid = 1001;
//主网
// var contractAddress = "n1zq28Ko8towJhvkAbSHm7eW5HyTQ5a3pZ1";
// var chainid = 1;

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

    });
}

//智能合约充值
function reCharge() {

    var amount = $("#reCharge_number").val();

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

                balanceOf();
                getContractBalance();
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
                    Materialize.toast('TXid: ' + tx.txhash, 5000);
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

        Materialize.toast('用户游戏账户个人余额更新成功', 2000);
        $('#contract_balance').text(result.balance/1e18 + 'NAS');
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

        Materialize.toast('当前智能合约奖金池更新成功', 2000);
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
                    value: amount * 1e18,
                    nonce: parseInt(state.nonce) + 1,
                    gasPrice: 1000000,
                    gasLimit: 2000000,
                    contract: {function: "afterAward", args: ""}
                });
                tx.signTransaction();
                neb.api.sendRawTransaction({data: tx.toProtoString()}).then(function (tx) {
                    Materialize.toast('TXid: ' + tx.txhash, 5000);
                });
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

        $('#getAllUser').text(result);
    });

}