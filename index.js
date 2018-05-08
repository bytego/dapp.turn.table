'use strict'
var HttpRequest = require("nebulas").HttpRequest;
var Neb = require("nebulas").Neb;
var Account = require("nebulas").Account;
var account = null;
var keyfile = null;
var Transaction = require("nebulas").Transaction;
var neb = new Neb();
neb.setRequest(new HttpRequest("https://testnet.nebulas.io"));
var contractAddress = "n1rpFa6tkJEJCGDTxTyjxuTX6iDetEBSobJ";
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
$('#keyfilepassword').change(function (e) {
    Materialize.toast('正在查询地址信息', 3000);
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
        Materialize.toast('信息查询成功', 3000);
    });
});

function refresh() {
    $('table#hubtable>tbody').html('');
    neb.api.call({
        chainID: chainid,
        from: "n1aaaasHmuqj99aRNgikXWZ6bwzscx8Xo2X",
        to: contractAddress,
        value: 0,
        nonce: 0,
        gasPrice: 1000000,
        gasLimit: 2000000,
        contract: {function: "lastGame", args: ''}
    }).then(function (data) {
        var result = JSON.parse(data.result);
        result.forEach(function (e) {
            var status = null;
            if (e.isEnd === true) {
                status = '已经结束';
            } else if (e.playerBAddress === null) {
                status = '等待加入';
            } else if (e.playerAChoice === null || e.playerBChoice === null) {
                status = '等待公布';
            }
            $('table#hubtable>tbody').append('<tr><td>' + e.id + '</td><td>' + e.playerAAddress + '</td><td>' + (e.amount / 1e18).toFixed(18) + ' NAS</td><td>' + status + '</td><td><a class="btn" onclick="javascript:$(\'#gameid\')[0].value=' + e.id + ';query()">查看</a></td></tr>');
        });
    });
}

refresh();

function query() {
    var id = $('#gameid')[0].value;
    neb.api.call({
        chainID: chainid,
        from: "n1aaaasHmuqj99aRNgikXWZ6bwzscx8Xo2X",
        to: contractAddress,
        value: 0,
        nonce: 0,
        gasPrice: 1000000,
        gasLimit: 2000000,
        contract: {function: "getGame", args: JSON.stringify([id])}
    }).then(function (data) {
        var result = JSON.parse(data.result);
        if (result === null) {
            Materialize.toast('无此游戏', 3000);
            return;
        }
        var status = null;
        var pac = null;
        var pbc = null;
        var endtime = new Date();
        if (result.endTime === null) {
            endtime = '无数据';
        } else {
            endtime.setTime(result.endTime * 1000);
        }
        if (result.isEnd === true) {
            status = '已经结束';
        } else if (result.playerBAddress === null) {
            status = '等待加入';
        } else if (result.playerAChoice === null || result.playerBChoice === null) {
            status = '等待公布';
        }
        switch (result.playerAChoice) {
            case 1:
                pac = '剪刀';
                break;
            case 2:
                pac = '石头';
                break;
            case 3:
                pac = '布';
                break;
        }
        switch (result.playerBChoice) {
            case 1:
                pbc = '剪刀';
                break;
            case 2:
                pbc = '石头';
                break;
            case 3:
                pbc = '布';
                break;
        }
        $('#thisamount').text((result.amount / 1e18).toFixed(18) + ' NAS');
        $('#thisaaddress').text(result.playerAAddress);
        $('#thisaahoice').text(pac);
        $('#thisbaddress').text(result.playerBAddress);
        $('#thisbchoice').text(pbc);
        $('#thisstatus').text(status);
        $('#thisendtime').text(endtime);
    });
}

function mygamerefresh() {
    if (account === null || account.getPrivateKey() === undefined) {
        Materialize.toast('请先设置私钥', 3000);
        return;
    }
    neb.api.call({
        chainID: chainid,
        from: "n1aaaasHmuqj99aRNgikXWZ6bwzscx8Xo2X",
        to: contractAddress,
        value: 0,
        nonce: 0,
        gasPrice: 1000000,
        gasLimit: 2000000,
        contract: {function: "getUserGames", args: JSON.stringify([account.getAddressString()])}
    }).then(function (data) {
        var result = JSON.parse(data.result);
        if (result === null) {
            Materialize.toast('没有找到此帐号的游戏记录', 3000);
            return;
        }
        $('#mygames').text(result.join('\t'));
    });
}

function newgame() {
    if (account === null || account.getPrivateKey() === undefined) {
        Materialize.toast('请先设置私钥', 3000);
        return;
    }
    var amount = parseFloat($('#newamount')[0].value);
    var salt = $('#newsalt')[0].value;
    var choice = null;
    var newchoice = $('#newchoice').val();
    switch (newchoice) {
        case '剪刀':
            choice = 1;
            break;
        case '石头':
            choice = 2;
            break;
        case '布':
            choice = 3;
            break;
        default:
            Materialize.toast('出手不正确', 3000);
            return;
    }
    if (amount === '' || salt === '') {
        Materialize.toast('请先填写好相关信息', 3000);
        return;
    }
    var hash = md5(choice + '!_!+@_@' + salt);
    if (amount > parseFloat($('#balance').text())) {
        Materialize.toast('资金不足', 3000);
        return;
    }
    var r = confirm("您正在创建新游戏\n\n金额：" + amount.toFixed(18) + ' NAS\n盐：' + salt + '\n选择：' + newchoice + '\n\n执行交易请点击确认');
    if (r) {
        neb.api.call({
            chainID: chainid,
            from: account.getAddressString(),
            to: contractAddress,
            value: amount * 1e18,
            nonce: 0,
            gasPrice: 1000000,
            gasLimit: 2000000,
            contract: {function: "newGame", args: JSON.stringify([hash])}
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
                        contract: {function: "newGame", args: JSON.stringify([hash])}
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
}

function joingame() {
    if (account === null || account.getPrivateKey() === undefined) {
        Materialize.toast('请先设置私钥', 3000);
        return;
    }
    var id = parseInt($('#joinid')[0].value);
    var salt = $('#joinsalt')[0].value;
    var choice = null;
    var joinchoice = $('#joinchoice').val();
    switch (joinchoice) {
        case '剪刀':
            choice = 1;
            break;
        case '石头':
            choice = 2;
            break;
        case '布':
            choice = 3;
            break;
        default:
            Materialize.toast('出手不正确', 3000);
            return;
    }
    if (id === '' || salt === '') {
        Materialize.toast('请先填写好相关信息', 3000);
        return;
    }
    var hash = md5(choice + '!_!+@_@' + salt);
    var r = confirm("您正在加入游戏\n\nID：" + id + '\n盐：' + salt + '\n选择：' + joinchoice + '\n\n执行交易请点击确认');
    if (r) {
        neb.api.call({
            chainID: chainid,
            from: "n1aaaasHmuqj99aRNgikXWZ6bwzscx8Xo2X",
            to: contractAddress,
            value: 0,
            nonce: 0,
            gasPrice: 1000000,
            gasLimit: 2000000,
            contract: {function: "getGame", args: JSON.stringify([id])}
        }).then(function (game) {
            game = JSON.parse(game.result);
            if (game.amount > parseFloat($('#balance').text()) * 1e18) {
                Materialize.toast('资金不足', 3000);
                return;
            }
            if (game.isEnd || game.playerBAddress !== null) {
                Materialize.toast('游戏已经开始或已经结束', 3000);
                return;
            }
            var r = false;
            if (game.amount === 0) {
                r = true;
            } else {
                r = confirm('加入该游戏需要发送\n\n' + (game.amount / 1e18).toFixed(18) + ' NAS 到合约中\n\n是否继续加入？');
            }
            if (r) {
                neb.api.call({
                    chainID: chainid,
                    from: account.getAddressString(),
                    to: contractAddress,
                    value: game.amount,
                    nonce: 0,
                    gasPrice: 1000000,
                    gasLimit: 2000000,
                    contract: {function: "joinGame", args: JSON.stringify([id, hash])}
                }).then(function (call) {
                    if (call.execute_err === '') {
                        neb.api.getAccountState({address: account.getAddressString()}).then(function (state) {
                            $('#balance').text(state.balance / 1e18 + ' NAS');
                            var tx = new Transaction({
                                chainID: chainid,
                                from: account,
                                to: contractAddress,
                                value: game.amount,
                                nonce: parseInt(state.nonce) + 1,
                                gasPrice: 1000000,
                                gasLimit: 2000000,
                                contract: {function: "joinGame", args: JSON.stringify([id, hash])}
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
        });
    }
}

function revealgame() {
    if (account === null || account.getPrivateKey() === undefined) {
        Materialize.toast('请先设置私钥', 3000);
        return;
    }
    var id = parseInt($('#revealid')[0].value);
    var salt = $('#revealsalt')[0].value;
    var choice = null;
    var revealchoice = $('#revealchoice').val();
    switch (revealchoice) {
        case '剪刀':
            choice = 1;
            break;
        case '石头':
            choice = 2;
            break;
        case '布':
            choice = 3;
            break;
        default:
            Materialize.toast('出手不正确', 3000);
            return;
    }
    if (id === '' || salt === '') {
        Materialize.toast('请先填写好相关信息', 3000);
        return;
    }
    var r = confirm("您正在公开出手\n\nID：" + id + '\n盐：' + salt + '\n选择：' + revealchoice + '\n\n执行交易请点击确认');
    if (r) {
        neb.api.call({
            chainID: chainid,
            from: "n1aaaasHmuqj99aRNgikXWZ6bwzscx8Xo2X",
            to: contractAddress,
            value: 0,
            nonce: 0,
            gasPrice: 1000000,
            gasLimit: 2000000,
            contract: {function: "getGame", args: JSON.stringify([id])}
        }).then(function (game) {
            game = JSON.parse(game.result);
            if (game.isEnd) {
                Materialize.toast('游戏已经开始或已经结束', 3000);
                return;
            }
            neb.api.call({
                chainID: chainid,
                from: account.getAddressString(),
                to: contractAddress,
                value: 0,
                nonce: 0,
                gasPrice: 1000000,
                gasLimit: 2000000,
                contract: {function: "revealGame", args: JSON.stringify([id, choice, salt])}
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
                            contract: {function: "revealGame", args: JSON.stringify([id, choice, salt])}
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
        });
    }
}

function endgame() {
    if (account === null || account.getPrivateKey() === undefined) {
        Materialize.toast('请先设置私钥', 3000);
        return;
    }
    var id = parseInt($('#endid')[0].value);
    if (id === '') {
        Materialize.toast('请先填写好相关信息', 3000);
        return;
    }
    var r = confirm("您正在强行关闭游戏\n\nID：" + id + '\n\n执行交易请点击确认');
    if (r) {
        neb.api.call({
            chainID: chainid,
            from: account.getAddressString(),
            to: contractAddress,
            value: 0,
            nonce: 0,
            gasPrice: 1000000,
            gasLimit: 2000000,
            contract: {function: "forceEnd", args: JSON.stringify([id])}
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
                        contract: {function: "forceEnd", args: JSON.stringify([id])}
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
}

$(document).ready(function () {
    $('.slider').slider();
    $('.parallax').parallax();
    $('.scrollspy').scrollSpy();
    $(".dropdown-button").dropdown();
    $(".button-collapse").sideNav();
    $('select').material_select();
    $('.datepicker').pickadate({selectMonths: true, selectYears: 15});
    $('.modal-trigger').leanModal();
    $('.carousel').carousel();
});