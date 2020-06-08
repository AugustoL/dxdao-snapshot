const fs = require('fs');
const Web3 = require('web3');
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades');
var _ = require('lodash');
const args = process.argv;
require('dotenv').config();
const http = require('http');
const ethDecoder = require("@maticnetwork/eth-decoder");

// Get network to use from arguments
let network, web3, reset=false, fast=false, toBlock='latest';
for (var i = 0; i < args.length; i++) {
  if (args[i] == '-network')
    network = args[i+1];
  if (args[i] == '-reset')
    reset = true;
  if (args[i] == '-fast')
    fast = true;
  if (args[i] == '-toBlock')
    toBlock = args[i+1];
}
if (!network) throw('Not network selected, --network parameter missing');

const sleep = ms => new Promise(resolve => setTimeout(resolve,  (fast) ? 0 : ms));

const EtherscanAPIToken = process.env.KEY_ETHERSCAN
const httpProviderUrl = `https://${network}.infura.io/v3/${process.env.KEY_INFURA_API_KEY }`

console.log('Running information script on', httpProviderUrl)
const provider = new Web3.providers.HttpProvider(httpProviderUrl);
web3 = new Web3(provider)
ZWeb3.initialize(web3.currentProvider);

const DxController = Contracts.getFromLocal('DxController');
const DxAvatar = Contracts.getFromLocal('DxAvatar');
const DxReputation = Contracts.getFromLocal('DxReputation');
const DxToken = Contracts.getFromLocal('DxToken');
const GenesisProtocol = Contracts.getFromLocal('GenesisProtocol');
const DxLockMgnForRep = Contracts.getFromLocal('DxLockMgnForRep');
const DxGenAuction4Rep = Contracts.getFromLocal('DxGenAuction4Rep');
const DxLockEth4Rep = Contracts.getFromLocal('DxLockEth4Rep');
const DxLockWhitelisted4Rep = Contracts.getFromLocal('DxLockWhitelisted4Rep');
const DutchXScheme = Contracts.getFromLocal('DutchXScheme');
const SchemeRegistrar = Contracts.getFromLocal('SchemeRegistrar');
const ContributionReward = Contracts.getFromLocal('ContributionReward');
const EnsPublicResolverScheme = Contracts.getFromLocal('EnsPublicResolverScheme');
const EnsRegistrarScheme = Contracts.getFromLocal('EnsRegistrarScheme');
const EnsRegistryScheme = Contracts.getFromLocal('EnsRegistryScheme');
const TokenRegistry = Contracts.getFromLocal('TokenRegistry');

const logDecoder = new ethDecoder.default.LogDecoder(
  [
    DxController.schema.abi,
    DxAvatar.schema.abi,
    DxReputation.schema.abi,
    DxToken.schema.abi,
    GenesisProtocol.schema.abi,
    DxLockMgnForRep.schema.abi,
    DxGenAuction4Rep.schema.abi,
    DxLockEth4Rep.schema.abi,
    DxLockWhitelisted4Rep.schema.abi,
    DutchXScheme.schema.abi,
    SchemeRegistrar.schema.abi,
    ContributionReward.schema.abi,
    EnsPublicResolverScheme.schema.abi,
    EnsRegistrarScheme.schema.abi,
    EnsRegistryScheme.schema.abi,
    TokenRegistry.schema.abi
  ]
);

const contracts = require('../contracts.json');
const dxController = DxController.at(contracts.DxController);
const dxAvatar = DxAvatar.at(contracts.DxAvatar);
const dxReputation = DxReputation.at(contracts.DxReputation);
const dxToken = DxToken.at(contracts.DxToken);
const genesisProtocol = DxToken.at(contracts.GenesisProtocol);

let schemes = {};
schemes[contracts.schemes.DxLockMgnForRep] = DxLockMgnForRep.at(contracts.schemes.DxLockMgnForRep);  
schemes[contracts.schemes.DxGenAuction4Rep] = DxGenAuction4Rep.at(contracts.schemes.DxGenAuction4Rep);  
schemes[contracts.schemes.DxLockEth4Rep] = DxLockEth4Rep.at(contracts.schemes.DxLockEth4Rep);  
schemes[contracts.schemes.DxLockWhitelisted4Rep] = DxLockWhitelisted4Rep.at(contracts.schemes.DxLockWhitelisted4Rep);  
schemes[contracts.schemes.DutchXScheme] = DutchXScheme.at(contracts.schemes.DutchXScheme);  
schemes[contracts.schemes.SchemeRegistrar] = SchemeRegistrar.at(contracts.schemes.SchemeRegistrar);  
schemes[contracts.schemes.ContributionReward] = ContributionReward.at(contracts.schemes.ContributionReward);  
schemes[contracts.schemes.EnsPublicResolverScheme] = EnsPublicResolverScheme.at(contracts.schemes.EnsPublicResolverScheme);  
schemes[contracts.schemes.EnsRegistrarScheme] = EnsRegistrarScheme.at(contracts.schemes.EnsRegistrarScheme);  
schemes[contracts.schemes.EnsRegistryScheme] = EnsRegistryScheme.at(contracts.schemes.EnsRegistryScheme);  
schemes[contracts.schemes.TokenRegistry] = TokenRegistry.at(contracts.schemes.TokenRegistry);  

const DXdaoSnapshotTemplate = {
  fromBlock: 0,
  toBlock: 0,
};

const DXdaoTransactionsTemplate = {
  fromBlock: 0,
  toBlock: 0,
  controller: {
    txs: [],
    internalTxs: [],
    events: []
  },
  avatar: {
    txs: [],
    internalTxs: [],
    events: []
  },
  reputation: {
    txs: [],
    internalTxs: [],
    events: []
  },
  token: {
    txs: [],
    internalTxs: [],
    events: []
  },
  genesisProtocol: {
    txs: [],
    internalTxs: [],
    events: []
  },
  schemes: {}
};

// Fecth existent snapshot & transaction 
let DXdaoSnapshot = DXdaoSnapshotTemplate;
let DXdaoTransactions = DXdaoTransactionsTemplate;

if (fs.existsSync('./DXdaoSnapshot.json') && !reset)
  DXdaoSnapshot = Object.assign(DXdaoSnapshotTemplate, JSON.parse(fs.readFileSync('DXdaoSnapshot.json', 'utf-8')));

if (fs.existsSync('./DXdaoTransactions.json') && !reset)
  DXdaoTransactions = Object.assign(DXdaoTransactionsTemplate, JSON.parse(fs.readFileSync('DXdaoTransactions.json', 'utf-8')));

async function main() {

  // Set last confirmed block as toBlock
  
  if (toBlock == 'latest')
    toBlock = (await web3.eth.getBlock('latest')).number;
    
  let fromBlock = DXdaoTransactions.toBlock + 1;

  if (reset){
    fromBlock = 7850000;
    DXdaoSnapshot.fromBlock = fromBlock;
    DXdaoTransactions.fromBlock = fromBlock;
  }
  
  DXdaoSnapshot.toBlock = toBlock;
  DXdaoTransactions.toBlock = toBlock;
  
  console.log('Getting from block', fromBlock, 'to block', toBlock);

  async function makeSynchronousRequest(url) {
  	try {
  		let http_promise = new Promise((resolve, reject) => {
    		http.get(url, (response) => {
    			let chunks_of_data = [];

    			response.on('data', (fragments) => {
    				chunks_of_data.push(fragments);
    			});

    			response.on('end', () => {
    				let response_body = Buffer.concat(chunks_of_data);
    				resolve(response_body.toString());
    			});

    			response.on('error', (error) => {
    				reject(error);
    			});
    		});
    	});
  		return JSON.parse(await http_promise).result;
  	}
  	catch(error) {
  		console.error(error);
  	}
  }
    
  async function getTransactions(_address, _fromBlock, _toBlock) {
    let txsEtherscan = await makeSynchronousRequest(
      'http://api.etherscan.io/api?module=account&action=txlist&address='
      +_address
      +'&startblock='+_fromBlock
      +'&endblock='+_toBlock
      +'&sort=asc&apikey='
      +EtherscanAPIToken
    )
    let internalTxsEtherscan = await makeSynchronousRequest(
      'http://api.etherscan.io/api?module=account&action=txlistinternal&address='
      +_address
      +'&startblock='+_fromBlock
      +'&endblock='+_toBlock
      +'&sort=asc&apikey='
      +EtherscanAPIToken
    )
    let txs = [];
    let internalTxs = [];
    for (var i = 0; i < txsEtherscan.length; i++) {
      console.log('Getting tx info', txsEtherscan[i].hash, 'for address', _address)
      await sleep(10);
      let txToPush = await web3.eth.getTransaction(txsEtherscan[i].hash);
      txToPush.receipt = await web3.eth.getTransactionReceipt(txsEtherscan[i].hash);
      if (txToPush.receipt.logs)
        txToPush.receipt.logs = logDecoder.decodeLogs(txToPush.receipt.logs)
      txs.push(txToPush);
    }
    for (var i = 0; i < internalTxsEtherscan.length; i++) {
      console.log('Getting internal tx info', internalTxsEtherscan[i].hash, 'for address', _address)
      await sleep(10);
      let internalTxToPush = await web3.eth.getTransactionReceipt(internalTxsEtherscan[i].hash);
      if (internalTxToPush.logs)
        internalTxToPush.logs = logDecoder.decodeLogs(internalTxToPush.logs)
      internalTxs.push(internalTxToPush);
    }
    
    console.log('Total transactions:',txs.length,'; Total internal transactions:', internalTxs.length);
    return { txs, internalTxs };
  }
  
  let transactionsFetched;
  console.log('Getting txs from controller..');
  transactionsFetched = await getTransactions(dxController.address, fromBlock, toBlock);
  DXdaoTransactions.controller.txs = DXdaoTransactions.controller.txs.concat(transactionsFetched.txs);
  DXdaoTransactions.controller.internalTxs = DXdaoTransactions.controller.internalTxs.concat(transactionsFetched.internalTxs);
  
  console.log('Getting txs from avatar..')
  transactionsFetched = await getTransactions(dxAvatar.address, fromBlock, toBlock);
  DXdaoTransactions.avatar.txs = DXdaoTransactions.avatar.txs.concat(transactionsFetched.txs)
  DXdaoTransactions.avatar.internalTxs = DXdaoTransactions.avatar.internalTxs.concat(transactionsFetched.internalTxs)
  
  console.log('Getting txs from token..')
  transactionsFetched = await getTransactions(dxToken.address, fromBlock, toBlock);
  DXdaoTransactions.token.txs = DXdaoTransactions.token.txs.concat(transactionsFetched.txs)
  DXdaoTransactions.token.internalTxs = DXdaoTransactions.token.internalTxs.concat(transactionsFetched.internalTxs)
  
  console.log('Getting txs from reputation..')
  transactionsFetched = await getTransactions(dxReputation.address, fromBlock, toBlock);
  DXdaoTransactions.reputation.txs = DXdaoTransactions.reputation.txs.concat(transactionsFetched.txs)
  DXdaoTransactions.reputation.internalTxs = DXdaoTransactions.reputation.internalTxs.concat(transactionsFetched.internalTxs)
  
  console.log('Getting txs from genesisProtocol..')
  transactionsFetched = await getTransactions(genesisProtocol.address, fromBlock, toBlock);
  DXdaoTransactions.genesisProtocol.txs = DXdaoTransactions.genesisProtocol.txs.concat(transactionsFetched.txs)
  DXdaoTransactions.genesisProtocol.internalTxs = DXdaoTransactions.genesisProtocol.internalTxs.concat(transactionsFetched.internalTxs)
  
  console.log('Getting events info for controller')
  DXdaoTransactions.controller.events = DXdaoTransactions.controller.events.concat( await dxController.getPastEvents(
    'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
  ));
  console.log('Getting events info for avatar')
  DXdaoTransactions.avatar.events = DXdaoTransactions.avatar.events.concat( await dxAvatar.getPastEvents(
    'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
  ));
  console.log('Getting events info for token')
  DXdaoTransactions.token.events = DXdaoTransactions.token.events.concat( await dxToken.getPastEvents(
    'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
  ));
  console.log('Getting events info for reputation')
  DXdaoTransactions.reputation.events = DXdaoTransactions.reputation.events.concat( await dxReputation.getPastEvents(
    'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
  ));
  console.log('Getting events info for genesisProtocol')
  DXdaoTransactions.genesisProtocol.events = DXdaoTransactions.genesisProtocol.events.concat( await genesisProtocol.getPastEvents(
    'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
  ));
  
  console.log('Getting txs from schemes..')
  for (var schemeAddress in schemes) {
    console.log('Getting txs from scheme', schemeAddress);
    await sleep(30000);
    if (schemes.hasOwnProperty(schemeAddress)) {
      transactionsFetched = await getTransactions(schemeAddress, fromBlock, toBlock);
      if (!DXdaoTransactions.schemes[schemeAddress])
        DXdaoTransactions.schemes[schemeAddress] = { txs: [], internalTxs: [], events: [] };
        DXdaoTransactions.schemes[schemeAddress] = { txs: [], internalTxs: [], events: [] };
      
      DXdaoTransactions.schemes[schemeAddress].txs = DXdaoTransactions.token.txs.concat(transactionsFetched.txs)
      DXdaoTransactions.schemes[schemeAddress].internalTxs = DXdaoTransactions.token.internalTxs.concat(transactionsFetched.internalTxs)
      DXdaoTransactions.schemes[schemeAddress].events = DXdaoTransactions.schemes[schemeAddress].events.concat(
        await schemes[schemeAddress].getPastEvents(
        'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
        )
      );
      _.remove(DXdaoTransactions.schemes[schemeAddress].events, (contractEvent) => {
        return contractEvent.returnValues._avatar && (contractEvent.returnValues._avatar != dxAvatar.address)
      });
    }
  }
  
  fs.writeFileSync('DXdaoSnapshot.json', JSON.stringify(DXdaoSnapshot, null, 2), {encoding:'utf8',flag:'w'});
  fs.writeFileSync('DXdaoTransactions.json', JSON.stringify(DXdaoTransactions, null, 2), {encoding:'utf8',flag:'w'});
} 

Promise.all([main()]).then(process.exit);
