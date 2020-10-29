// This script is callable by anybody, there is no protection needed.
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const ID = require('./identification');
const transactions = require('./transactions');
const randomBytes = require('randombytes');
// Make only one mongodb connection per session:  BY TOM:
var db;
global.CirclesCollection;
var MongoClient = require('mongodb').MongoClient;

// app.use(express.static(__dirname + '/client')); //for the Angular version
app.use(bodyParser.json());


// Airdrop tokens to an identity that does not have a genesis Circle yet
app.post('/api/oracleGetAirdrop', async (req, res) => {
	const id = req.body.id; // telephone number FTM
	const salt = req.body.salt; // a secret number which only the user controls
	// todo study changing with a timestamp, like done in Corona BLE apps.
	const pubkey = req.body.pubkey; //a HD wallet changing public key
	ID.checkExists(id, (error) => { //best would be to use an existing DID system preferably as trustless as possible
		if (error) {
			console.log("error: " + error + " Not allowed (id does not exist, id is not a person)");
			return res.status(400).json({ error: error + " Not allowed (id does not exist, id is not a person)" });
		}
		//http://www.lifewithalacrity.com/2004/03/the_dunbar_numb.html
		const algorithm = "const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId); else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId); else callback(PSBT);});});}"
		ID.hasNoGenesisCircle(id, (ans, error) => {
			if (error) {
				console.log("error: " + error);
				return res.status(400).json({ error: error });
			}
			const answ = transactions.createAndBroadcastCircleGenesisTx(id, pubkey, algorithm, 1e5, () => {
				const unspent = answ.unspent
				const CircleId = answ.CircleId
				const status = answ.status
				const err = answ.err
				if (err) {
					console.log("status " + status + " Not allowed (maybe the Id already has a genesis Circle(id)) " + CircleId + " " + err)
					return res.status(status).json({ error: "Not allowed (maybe the Id already has a genesis Circle(id)) " + CircleId + " " + err });
				}
				//0.001BTC ,   store UTXO in mongodb, e.g.   unpsent.txId en unspent.vout
				console.log({ error: "none", Circle: CircleId, tokens: (1e5 / 1e8), txId: unspent.txId, contract: algorithm })
				return res.status(200).json({ error: "none", Circle: CircleId, tokens: (1e5 / 1e8), txId: unspent.txId, contract: algorithm });// xx e.g. could e.g. be be the same as the current blockchain reward
				// but in this case you'll get the reward because you are an identity that does not have a genesis Circle yet.
			})
		})
	});
});

app.post('/api/oraclePleaseSignTx', (req, res) => {
	// const addressToUnlock = req.body.addressToUnlock;// "2MsM7mj7MFFBahGfba1tSJXTizPyGwBuxHC"; // example address
	const id = req.body.id;
	const circleId = req.body.circleId;

	const pubkeyInUTXO = req.body.pubkeyInUTXO; //For Privacyreasons: The client also has to keep track of the pubkey belonging to his last Circle transaction
	//instead of this pubkeyInUTXO we better transfer the hash of the script in transaction.PubScriptToUnlockContainsAHashOfContract
	const newPubkeyId = req.body.newPubkeyId;

	const pubkeyNewId = req.body.pubkeyNewId;
	const newId = req.body.newId;

	const contractAlgorithm = req.body.contract;
	// execute the contract if has its hash is in the pubscript to be unlocked
	transactions.PubScriptToUnlockContainsAHashOfContract(id, pubkeyInUTXO, contractAlgorithm, circleId, (err) => {
		if (err) {
			console.log({ error: err + " Not allowed (the unlockscript contains an incorrect information (contract or pubkey))" })
			return res.status(400).json({ error: err + " Not allowed (the unlockscript contains an incorrect information (contract or pubkey)) " })
		}
		//save contractALgorithm to contract.js and execute that contract.js
		try {
			var randFile;
			randomBytes(100, (err, buf) => {
				if (err) {
					console.log({ error: err });
					return res({ error: err });
				}
				else {
					randFile = path.join(__dirname, "contractTMP" + buf.toString('hex') + ".js");
					createTempContractFile(randFile, contractAlgorithm,
						function (err) {
							if (err) {
								console.log({ error: err });
								return res.status(500).json({ error: err });
							}
							try {
								require(randFile).contract(newId, async (errInContract) => {
									if (errInContract) {
										console.log({ error: errInContract })
										return res.json({ error: errInContract })
									}
									transactions.PSBT(id, pubkeyInUTXO, contractAlgorithm, newPubkeyId, newId, pubkeyNewId, circleId, function (PSBT, err) {
										if (err) {
											console.log({ error: err })
											return res.status(500).json({ error: err })
										}
										// const dummy = PSBT.data.inputs[0].partialSig[0].signature  // this is the signature of the Oracle oracleSignTx
										console.log({ error: "none", PSBT: PSBT })
										console.log({ error: "none", PSBT: PSBT.toHex() })


										//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
										// 										//temp:
										// 										const regtestClient = require('regtest-client');
										// 										const APIPASS = process.env.APIPASS || 'sastoshi';
										// 										const APIURL = process.env.APIURL || 'http://localhost:8080/1';
										// 										const regtestUtils = new regtestClient.RegtestUtils(APIPASS, APIURL)
										// 										const regtest = regtestUtils.network;
										// 										const bitcoin = require('bitcoinjs-lib');
										// 										var aClientSignTxID = bitcoin.ECPair.fromWIF(
										// 											'cW7jhU1AXDsxUgLuQQUnh2k3JAof3eaMgP9vEtsbvgpfWd4WM3sS', ///// TODO KEEP SECRET
										// 											regtest,
										// 										);

										// 										const psbt = require('./test/psbtMod/psbtMod').Psbt.fromHex(PSBT.toHex());
										// 										// const psbtObj = new Function('return ' + psbt.toString()+'')()
										// 										psbt.signInput(0, aClientSignTxID)

										// 										// you can use validate signature method provided by library to make sure generated signature is valid
										// 										if (!psbt.validateSignaturesOfAllInputs()) // if this returns false, then you can throw the error
										// 										{
										// 											console.log("could not validate signatures of psbt ")
										// 										}

										// 										psbt.finalizeAllInputs(regtest)


										// 										// signed transaction hex
										// 										const transaction = psbt.extractTransaction()
										// 										const signedTransaction = transaction.toHex()
										// 										const transactionId = transaction.getId()
										// 										// sign transaction end

										// 										// // build and broadcast to the Bitcoin RegTest network
										// 										async function dum() {console.log (await regtestUtils.broadcast(signedTransaction))}
										// 										dum();
										// 										//endtemp 
										// //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
										return res.status(200).json({ error: "none", PSBT: PSBT.toHex() })

									})
								})
							}
							catch (e2) {
								//client error = status 400
								console.log({
									error: "invalid contract syntax. expecting exactly: " +
										"const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId); else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId); else callback(PSBT);});});}"
								}
								);
								return res.status(400).json({
									error: "invalid contract syntax. expecting exactly: " +
										"const ID = require('./identification');const dunbarsNumber = 150; module.exports.contract = (newId, callback) => { ID.checkExists(newId, (err) => {if (err) callback('', err + 'Not allowed (newId does not exist)');ID.hasGenesisCircle(newId, (err, circleId) => {if (err) callback('', err + ' Not allowed (NewId already in Circleinstance) ' + circleId); else if (CircleId.nrOfMembers >= dunbarsNumber) callback('', err + ' Not allowed (Circleinstance has reached the limit of ' + dunbarsNumber + ' unique Ids) ' + circleId); else callback(PSBT);});});}"
								}
								);
							}
						})
				}
			});
		}
		catch (e) {
			console.log({ error: "invalid contract syntax. Include \"contract\": in jour JSON. " + e });
			return res.status(400).json({ error: "invalid contract syntax. Include \"contract\": in jour JSON. " + e });
		}
	})
});

app.post('/api/GiveTxIdToOracle', (req, res) => {
	const instanceCircles = req.body.instanceCircles;
	const id = req.body.id;

	const txId = req.body.txId;

	//get address of public key:  https://bitcoin.stackexchange.com/a/54999/45311
	//update mongoDB here for instanceCircles, id   combination with valuyes txId and address (ToUnlock)
	CirclesCollection.updateOne(
		// { "Attribute": "good" },
		{ instanceCircles: instanceCircles, saltedHashedIdentification: id },
		{ $set: { txId: txId, addressToUnlock: address } },
		function (err, circles) {
			if (err) { return res.status(500).json({ error: "Something went wrong while updating!" + err }) }
			// addressToUnlock=circles[0].BTCaddress;
			// txId = circles[0].txId;
			// pubkeyUsedInUTXO = circles[0].pubKey; //do we lose some anonimity here? or should it be provided by USER id?
			return res.status(200).json({ error: "none" })
		})
});


function createTempContractFile(randFile, contractAlgorithm, callback) {
	//a janitor that deletes the contract file after 30 secs
	setTimeout((function (randFil) {
		return function () {
			rmFile(randFil)
		}
	})(randFile), 30000);
	fs.writeFile(randFile, contractAlgorithm, callback)
}

function rmFile(f) {
	fs.unlink(f, (err) => {
		if (err) {
			return console.log({ error: "Unexpected error removing " + f + " " + err })
		}
	})
}

//janitor clean any old contract files
require("glob").glob("contractTMP*.js", function (er, files) {
	if (er) console.log(er)
	for (f in files) {
		fs.unlink(files[f], (err) => {
			if (err) console.log({ error: "Unexpected error removing " + files[f] + " " + err })
		})
	}
});


// Make only one mongodb connection per session:  BY TOM:
// Initialize connection once
MongoClient.connect("mongodb://localhost:27017", { useNewUrlParser: true, useUnifiedTopology: true }, function (err, database) {
	if (err) throw err;

	db = database.db("carebycircles");
	// console.log(db);
	CirclesCollection = db.collection("circles");
	// console.log(CirclesCollection);


	// Start the application after the database connection is ready
	app.listen(3000);

	console.log("Listening on port 3000");
});


