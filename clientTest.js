//Handy:  https://github.com/BlockchainCommons/Learning-Bitcoin-from-the-Command-Line

const log = require('./oracleServer/logger')

const constants = require('./oracleServer/constants');
const CirclesOnClient = require('./lib/CirclesOnClient');
const fs = require('fs');
const bitcoin = require('bitcoinjs-lib');
const psbtHelper = require('./oracleServer/psbtHelper');
const ID = require('./oracleServer/identification');
const regtestClient = require('regtest-client'); /// seee https://github.com/bitcoinjs/regtest-client
const APIPASS = process.env.APIPASS || 'sastoshi';
const APIURL = constants.REGTEST_URL; //e.g.   localhost:8080/1/r/generate?432  see https://github.com/bitcoinjs/regtest-server/blob/master/routes/1.js
const regtestUtils = new regtestClient.RegtestUtils(APIPASS, APIURL)
const regtest = regtestUtils.network;
const randomBytes = require('randombytes');

const axios = require('axios')
const axiosInstance = axios.create({
    baseURL: constants.BASE_URL,
    timeout: 300000
});

// const keyPair = bitcoin.ECPair.makeRandom({ network: regtest }).toWIF();
const _AliceClientSignTxID = bitcoin.ECPair.fromWIF(  /// should be  a HD wallet
    'cW7jhU1AXDsxUgLuQQUnh2k3JAof3eaMgP9vEtsbvgpfWd4WM3sS', ///// TODO KEEP SECRET
    regtest,
);
const _saltAlice = 'AliceMonKey8sda89--__8933h8ih^%&*321i989d89as';  // a fixed random string used to one-way hash your personal data, if you change this number your id cannot (it will be pseudomous) be associated with any data stored on decentral storage
const _BobClientSignTxID = bitcoin.ECPair.fromWIF(  /// should be  a HD wallet
    'cU4suhCk1LDHEksGRen2293CmZE1GdfSA4V4A6GmwZvmVRC7Vpvu', ///// TODO KEEP SECRET
    regtest,
);
var _AliceId
var _BobId
var _CharlieId
//make randowm id's so we can test more than once
randomBytes(100, (err, buf) => {
    if (err) {
        console.log({ error: err });
        return res({ error: err });
    }
    else {
        _AliceId = 'Alice+31-6-233787929zc' + buf.toString('hex')
        _BobId = 'Bob+31-6-231610011' + buf.toString('hex')
        _CharlieId = 'Charlie+31-6-231231391' + buf.toString('hex')
    }
});
const _saltBob = 'BobVotreKey8e87we89usdfij34sd43a859^*&*(&()-f-__d89asbla';  // a fixed random string used to one-way hash your personal data, if you change this number your id cannot (it will be pseudomous) be associated with any data stored on decentral storage
const _CharlieClientSignTxID = bitcoin.ECPair.fromWIF(  /// should be  a HD wallet
    'cQEVDN4VVCjH3eSvdZGkkteQGAp5M94MwLK2qCqmwV7rztSzQocU', ///// TODO KEEP SECRET
    regtest,
);
const _saltCharlie = 'CharlieHatskikeydeeKey8e8789usdfi56j34sd430a8(**(59^*&*(&()-f-__d21387';  // a fixed random string used to one-way hash your personal data, if you change this number your id cannot (it will be pseudomous) be associated with any data stored on decentral storage

// Make only one mongodb connection per session:  BY TOM:
var db;
global.CirclesCollection;
var MongoClient = require('mongodb').MongoClient;

async function run() {

    //HD wallet?:
    // const path = "m/0'/0/0"
    // var mnemonic = 'praise you muffin enable lion neck crumble super myself grocery license ghost'  //id
    // // mnemonic = 'lion neck crumble super myself grocery license ghost praise you muffin enable'  //newId
    // const seed = await bip39.mnemonicToSeed(mnemonic)
    // const root = bip32.fromSeed(seed, regtest)
    // const child1 = root.derivePath("m/0'/0")
    // const child2 = root.derivePath("m/0'/1")
    // //public keys
    // const a = child1.publicKey.toString('hex')
    // const b = child2.publicKey.toString('hex')
    // //p2pkh addresses:
    // const aa = bitcoin.payments.p2pkh({ pubkey: child1.publicKey }).address
    // const ba = bitcoin.payments.p2pkh({ pubkey: child2.publicKey }).address
    // //private keys:
    // const ap = child1.privateKey.toString('hex') 
    // const bp = child2.privateKey.toString('hex')
    // force update MTP  (Merkle Tree Proof?)

    // force update MTP  
    await regtestUtils.mine(11);

    console.log("Alice gets an airdrop")
    const AlicePubkey = _AliceClientSignTxID.publicKey.toString('hex')
    axiosInstance.post('/oracleGetAirdrop', {
        // generate another pubkey from a WIF
        AlicePubkey: AlicePubkey,  //Alice wants to receive the airdrop towards this pubkey , client (HD wallet?) should remember (persistent storage)
        //  this as long as it contains tokens, or client could do scan of blockchain
        AliceId: _AliceId,
        saltAlice: _saltAlice,
    })
        .then(function (response) {
            var doc1 = CirclesOnClient({
                instanceCircles: response.data.Circle, newUTXO: response.data.addressOfUTXO, pubkey: AlicePubkey, Id: _AliceId, salt: _saltAlice,
                saltedHashedIdentification: ID.HMAC(_AliceId, _saltAlice), "version": constants.VERSION, satoshi: response.data.satoshiAliceLeft
            });//not all info needs be recorded on client, here just for debugging purposes
            CirclesClientCollection.insertOne(doc1, function (err, circles) {
                if (err) { console.log({ err: "Could not store the Circle." + err }); return }
                console.log("success creating genesis\nDone with succes");
                //add 2 friends to Alice's Circle
                CirclesClientCollection.find({ "saltedHashedIdentification": ID.HMAC(_AliceId, _saltAlice), "version": constants.VERSION }).toArray(function (err, circles) {
                    const AlicePubkey = _AliceClientSignTxID.publicKey.toString('hex')
                    if (err) { callback(err, "NotFound") } else
                        if (circles.length == 0) { console.log("No circles assigned to this user, make a genesis Circle first!") } else
                            if (circles.length != 1) {
                                console.log("Something went wrong terribly: more genesis circles assigned to a user!", "more than 1 Circle")
                                console.log("Did you switch from local regtest to remote (or the other way around), then clean your local client database first.")
                            }
                            else {
                                console.log("======>Alice accepts Bob in her Circle")
                                const BobPubkey = _BobClientSignTxID.publicKey.toString('hex')
                                UTXOAlice = circles[0].newUTXO
                                letJoin(AlicePubkey, BobPubkey, _BobId, _saltBob, circles[0].instanceCircles, UTXOAlice, true, (newUTXOBob, err) => {
                                    if (err) {
                                        console.log(newUTXOBob)
                                        return console.log("Done with error")
                                    }
                                    console.log("======>succeeded")
                                    const newUTXOAlice = UTXOAlice;  ///todo should get new one when a HD wallet is used!!!
                                    CirclesClientCollection.insertOne(
                                        {
                                            instanceCircles: circles[0].instanceCircles, saltedHashedIdentification: ID.HMAC(_BobId, _saltBob), "version": constants.VERSION,
                                            newUTXO: newUTXOBob, pubkey: BobPubkey, Id: _BobId, salt: _saltBob,
                                        }
                                        , function (err, cirkles) {
                                            if (err) { console.log("Could not store the Circle." + err); return }//todo update for client side of Charlie as well
                                            const CharliePubkey = _CharlieClientSignTxID.publicKey.toString('hex')
                                            console.log("======>Alice accepts Charlie in her Circle")
                                            letJoin(AlicePubkey, CharliePubkey, _CharlieId, _saltCharlie, circles[0].instanceCircles, newUTXOAlice, true, (newUTXOCharlie, err) => {  //store circleId, newUTXO  make persistent on client for Alice but also for Charlie
                                                if (err) {
                                                    console.log(newUTXOCharlie)
                                                    return console.log("Done with error")
                                                }
                                                console.log("======>succeeded")
                                                CirclesClientCollection.insertOne(
                                                    {
                                                        instanceCircles: circles[0].instanceCircles, saltedHashedIdentification: ID.HMAC(_CharlieId, _saltCharlie), "version": constants.VERSION,
                                                        newUTXO: newUTXOCharlie, pubkey: CharliePubkey, Id: _CharlieId, salt: _saltCharlie,
                                                    }
                                                    , function (err, cirkles) {
                                                        if (err) { console.log("Could not store the Circle." + err); console.log("Done with error"); return }//todo update for client side of Charlie as well
                                                        console.log("======>Alice tries to add Charlie with a incorrect contract, should fail")
                                                        const CharliePubkey = _CharlieClientSignTxID.publicKey.toString('hex')
                                                        letJoin(AlicePubkey, CharliePubkey, _CharlieId, _saltCharlie, circles[0].instanceCircles, newUTXOAlice, false, (dummy, err) => {
                                                            if (err) {
                                                                console.log("======>failed successfully")
                                                            } else {
                                                                console.log("======>!!!failed because of success")
                                                            }
                                                            console.log("======>Alice tries to re-add Charlie in her Circle, which should fail")
                                                            letJoin(AlicePubkey, CharliePubkey, _CharlieId, _saltCharlie, circles[0].instanceCircles, newUTXOAlice, true, (dummy, err) => {
                                                                if (err) {
                                                                    console.log(dummy)
                                                                    console.log("======>failed successfully")
                                                                    var failed = false;
                                                                    // See https://stackoverflow.com/a/11488129/964064 for using  a for loop with asynchornous function
                                                                    console.log("======>when a Circle already has 150 members, which should fail, when more or equal to 150")
                                                                    randomBytes(100, (err, buf) => {
                                                                        if (err) {
                                                                            console.log({ error: err });
                                                                            return res({ error: err });
                                                                        }
                                                                        else {
                                                                            letJoinSequential(0, 150, AlicePubkey, CharliePubkey, _CharlieId+buf.toString('hex'), _saltCharlie, circles[0].instanceCircles, newUTXOAlice);
                                                                        }
                                                                    });
                                                                } else {
                                                                    console.log("======>!!!failed because of success")
                                                                }
                                                                console.log("Done with success")
                                                            })
                                                        });
                                                    });
                                            })
                                        })
                                })
                            }
                })
            })
        }).catch(function (error) {
            console.log("error " + JSON.stringify(error))
            if (error.response) console.log("\n" + JSON.stringify(error.response.data))
            return console.log("Done with error");
        })

}
async function letJoinSequential(i, max, fromPubkey, toPubkey, toId, toSalt, circleID, UTXO) {
    if (i > max) {
    }
    else {
        var toId = "" + i + "just something else, every looprun.";
        letJoin(fromPubkey, toPubkey, toId, toSalt, circleID, UTXO, true, (dummy, err) => {
            if (err) {
                console.log("======>when a Circle already has 150 or more members, which should fail")
                console.log((i + 3) + "\n" + dummy)
                console.log("======>failed successfully")
                failed = true
            } else {
                console.log((i + 3) + "\n" + dummy)
                console.log("======>succeeded successfully")
            }
            i++;
            letJoinSequential(i, max, fromPubkey, toPubkey, toId, toSalt, circleID, UTXO, true)
        });
    }
}


async function letJoin(fromPubkey, toPubkey, toId, toSalt, circleID, UTXO, correctContract, callback) {
    //Now ALice will let Bob in her circle:
    const filenameContract = './oracleServer/ExamplecontractExample.js';
    fs.readFile(filenameContract, 'utf8', function (err, contract) {
        if (err) throw err;
        if (!correctContract) contract = "a=1 //waste, should not work as contract"
        axiosInstance.post('/oraclePleaseSignTx', {
            contract: contract, // maybe later do also in server:  contract.trim().replace(/\s+/g, ' '),  // http://www.lifewithalacrity.com/2004/03/the_dunbar_numb.html

            circleId: circleID,

            AliceId: _AliceId,
            saltAlice: _saltAlice,
            pubkeyInUTXO: fromPubkey,// get pubkey of UTXO from client persistent storage
            addressOfUTXO: UTXO,
            AliceNewPubkey: fromPubkey, //should be new HD wallet key

            BobId: toId,
            saltBob: toSalt,
            BobPubkey: toPubkey
        })
            .then(async function (response) {
                if (response.data.error && response.data.error != 'none') {
                    return callback(response.data.error, 'error');
                }
                ////////////////////////////
                //To combine signatures in parallel, see https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts
                ////////////////////////////
                // With PSBT, we can have multiple signers sign in parrallel and combine them.
                ////////////////////////////
                const psbt_from_Oracle_for_Alice_to_sign = bitcoin.Psbt.fromBase64(response.data.psbtBaseText, { network: regtest });//Alice = me
                // signInput and signInputAsync are better (They take the input index explicitly as the first arg)
                psbt_from_Oracle_for_Alice_to_sign.signAllInputs(_AliceClientSignTxID);
                // If your signer object's sign method returns a promise, use the following
                // await Alice.signAllInputsAsync(alice2.keys[0])
                // encode to send back to combiner (Oracle and Alice are not near each other)
                psbt_from_Oracle_for_Alice_to_sign.combine(bitcoin.Psbt.fromBase64(response.data.psbtSignedByOracleBaseText, { network: regtest }));
                // This step is new. Since we separate the signing operation and
                // the creation of the scriptSig and witness stack, we are able to
                psbt_from_Oracle_for_Alice_to_sign.finalizeInput(0, psbtHelper.getFinalScripts2)
                if (true) //regtest //                 // build and broadcast to our RegTest network
                {
                    if (axiosInstance.defaults.baseURL === 'http://localhost:3000/api/') {
                        // build and broadcast to our RegTest network
                        await regtestUtils.broadcast(psbt_from_Oracle_for_Alice_to_sign.extractTransaction().toHex());// to build and broadcast to the actual Bitcoin network, see https://github.com/bitcoinjs/bitcoinjs-lib/issues/839
                        // Mine 10 blocks, returns an Array of the block hashes
                        // the above psbt will confirm
                        await regtestUtils.mine(10);
                        // for bitcoin-cli decodepsbt use the psbt fromhex then to base64 (e.g. with cyberchef)
                        console.log('\npsbt can be decoded with \n"  bitcoin-cli -regtest decodepsbt ', psbt_from_Oracle_for_Alice_to_sign.toBase64() + '   "\n')//fromhex, tobase64  (e.g. with cyberchef)
                        console.log("======>Succes")
                        //////////////////////////////////////////////////////////////////////todo
                        //////////////////////////////////////////////////////////////////////todo
                        //////////////////////////////////////////////////////////////////////todo
                        //////////////////////////////////////////////////////////////////////todo
                        //////////////////////////////////////////////////////////////////////todo
                        // await regtestUtils.verify({
                        //     txId: psbt_from_Oracle_for_Alice_to_sign.extractTransaction().toHex(),
                        //     address: fromPubkey,
                        //     vout: 0,
                        //     value: response.data.tokens,
                        // });
                        //////////////////////////////////////////////////////////////////////todo
                        callback(response.data.addressOfUTXO);
                    } else { //remote regtest baseURL: 'https://www.carebycircle.com/api',
                        axiosInstance.post('/broadcastToRegtest', {
                            // generate another pubkey from a WIF
                            psbtToBroadcast: psbt_from_Oracle_for_Alice_to_sign.toBase64(),  //Alice wants to receive the airdrop towards this pubkey , client (HD wallet?) should remember (persistent storage)
                            //  this as long as it contains tokens, or client could do scan of blockchain
                        })
                            .then(function (responseCast, err) {
                                if (err) callback("", err);
                                callback(response.data.addressOfUTXO);
                            })
                    }
                } else {
                    // to build and broadcast to the actual Bitcoin network, see https://github.com/bitcoinjs/bitcoinjs-lib/issues/839
                }
            })
            .catch(function (error) {
                console.log("error2 " + error)
                // if (error.stack) console.log("\n" + JSON.stringify(error.stack))
                if (error.response) console.log(JSON.stringify(error.response.data))
                callback("fail", "error");
            });
    });

}

// Make only one mongodb connection per session:  BY TOM:
// Initialize connection once
MongoClient.connect("mongodb://localhost:27017", { useNewUrlParser: true, useUnifiedTopology: true }, function (err, database) {
    if (err) throw err;

    db = database.db("carebycircles");
    // console.log(db);
    CirclesClientCollection = db.collection("clientData");
    // console.log(CirclesCollection);

    // Start the application after the database connection is ready
    run();
});

