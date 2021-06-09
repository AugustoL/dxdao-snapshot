const fs = require('fs');
const hre = require("hardhat");
const web3 = hre.web3;
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades');
var _ = require('lodash');
require('dotenv').config();
const http = require('http');
const https = require('https');
const ethDecoder = require("@maticnetwork/eth-decoder");

// Get network to use from arguments
let network = hre.network.name;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const EtherscanAPIToken = process.env.KEY_ETHERSCAN;
const BlockCyperEtherscanToken = process.env.KEY_BLOCKCYPHER;
console.log('Running transactions script on', hre.network.config.url)
ZWeb3.initialize(web3.currentProvider);

const DxController = artifacts.require('DxController');
const DxAvatar = artifacts.require('DxAvatar');
const DxReputation = artifacts.require('DxReputation');
const DxToken = artifacts.require('DxToken');
const GenesisProtocol = artifacts.require('contracts/GenesisProtocol.sol:GenesisProtocol');
const DxLockMgnForRep = artifacts.require('DxLockMgnForRep');
const DxGenAuction4Rep = artifacts.require('DxGenAuction4Rep');
const DxLockEth4Rep = artifacts.require('DxLockEth4Rep');
const DxLockWhitelisted4Rep = artifacts.require('DxLockWhitelisted4Rep');
const DutchXScheme = artifacts.require('DutchXScheme');
const SchemeRegistrar = artifacts.require('SchemeRegistrar');
const ContributionReward = artifacts.require('ContributionReward');
const EnsPublicProviderScheme = artifacts.require('EnsPublicProviderScheme');
const EnsRegistrarScheme = artifacts.require('EnsRegistrarScheme');
const EnsRegistryScheme = artifacts.require('EnsRegistryScheme');
const TokenRegistry = artifacts.require('TokenRegistry');
const GenericSchemeMultiCall = artifacts.require('GenericSchemeMultiCall');

const logDecoder = new ethDecoder.default.LogDecoder(
  [
    DxController._json.abi,
    DxAvatar._json.abi,
    DxReputation._json.abi,
    DxToken._json.abi,
    GenesisProtocol._json.abi,
    DxLockMgnForRep._json.abi,
    DxGenAuction4Rep._json.abi,
    DxLockEth4Rep._json.abi,
    DxLockWhitelisted4Rep._json.abi,
    DutchXScheme._json.abi,
    SchemeRegistrar._json.abi,
    ContributionReward._json.abi,
    EnsPublicProviderScheme._json.abi,
    EnsRegistrarScheme._json.abi,
    EnsRegistryScheme._json.abi,
    GenericSchemeMultiCall._json.abi,
    TokenRegistry._json.abi
  ]
);

const contracts = require('../contracts.json');

const DXdaoTransactionsTemplate = {
  fromBlock: 7850000,
  toBlock: 7850000,
  controller: {
    txs: [],
    internalTxs: [],
    events: [],
  },
  avatar: {
    txs: [],
    internalTxs: [],
    events: [],
  },
  reputation: {
    txs: [],
    internalTxs: [],
    events: [],
  },
  token: {
    txs: [],
    internalTxs: [],
    events: [],
  },
  genesisProtocol: {
    txs: [],
    internalTxs: [],
    events: [],
  },
  schemes: {},
};
// Fecth existent transactions file
let DXdaoTransactions = DXdaoTransactionsTemplate;
  if (fs.existsSync('./DXdaoTransactions.json'))
    DXdaoTransactions = Object.assign(DXdaoTransactionsTemplate, JSON.parse(fs.readFileSync('DXdaoTransactions.json', 'utf-8')));

async function main() {
  
  // Instantiate contracts
  const dxController = await DxController.at(contracts.DxController);
  const dxAvatar = await DxAvatar.at(contracts.DxAvatar);
  const dxReputation = await DxReputation.at(contracts.DxReputation);
  const dxToken = await DxToken.at(contracts.DxToken);
  const genesisProtocol = await GenesisProtocol.at(contracts.GenesisProtocol);
  let schemes = {};
  schemes[contracts.schemes.DxLockMgnForRep] = await DxLockMgnForRep.at(contracts.schemes.DxLockMgnForRep);
  schemes[contracts.schemes.DxGenAuction4Rep] = await DxGenAuction4Rep.at(contracts.schemes.DxGenAuction4Rep);
  schemes[contracts.schemes.DxLockEth4Rep] = await DxLockEth4Rep.at(contracts.schemes.DxLockEth4Rep);
  schemes[contracts.schemes.DxLockWhitelisted4Rep] = await DxLockWhitelisted4Rep.at(contracts.schemes.DxLockWhitelisted4Rep);
  schemes[contracts.schemes.DutchXScheme] = await DutchXScheme.at(contracts.schemes.DutchXScheme);
  schemes[contracts.schemes.SchemeRegistrar] = await SchemeRegistrar.at(contracts.schemes.SchemeRegistrar);
  schemes[contracts.schemes.ContributionReward] = await ContributionReward.at(contracts.schemes.ContributionReward);
  schemes[contracts.schemes.EnsPublicProviderScheme] = await EnsPublicProviderScheme.at(contracts.schemes.EnsPublicProviderScheme);
  schemes[contracts.schemes.EnsRegistrarScheme] = await EnsRegistrarScheme.at(contracts.schemes.EnsRegistrarScheme);
  schemes[contracts.schemes.EnsRegistryScheme] = await EnsRegistryScheme.at(contracts.schemes.EnsRegistryScheme);
  schemes[contracts.schemes.TokenRegistry] = await TokenRegistry.at(contracts.schemes.TokenRegistry);
  schemes[contracts.schemes.EnsPublicResolverScheme] = await EnsPublicProviderScheme.at(contracts.schemes.EnsPublicResolverScheme);
  
  for (var i = 0; i < contracts.schemes.multicalls.length; i++)
    schemes[contracts.schemes.multicalls[i]] = await GenericSchemeMultiCall.at(contracts.schemes.multicalls[i]);

  // Set last confirmed block as toBlock is toBlock is latest
  const toBlock = (process.env.TO_BLOCK == 'latest') ? (await web3.eth.getBlock('latest')).number : Number(process.env.TO_BLOCK);
    
  let fromBlock = (DXdaoTransactions.toBlock > 7850000) ? Number(DXdaoTransactions.toBlock) + 1 : 7850000;

  DXdaoTransactions.toBlock = toBlock;

  console.log('Getting from block', fromBlock, 'to block', toBlock);

  async function makeSynchronousRequest(url) {
    let protocol = http;
    if (url.substr(0,5)==='https')
      protocol = https
  	try {
  		let http_promise = new Promise((resolve, reject) => {
    		protocol.get(url, (response) => {
    			let chunks_of_data = [];

    			response.on('data', (fragments) => {
    				chunks_of_data.push(fragments);
    			});

    			response.on('end', () => {
    				let response_body = Buffer.concat(chunks_of_data);
    				resolve({
              body: response_body.toString(),
              type: response.headers['content-type'],
              status: response.statusCode
            });
    			});

    			response.on('error', (error) => {
    				reject(error);
    			});
    		});
    	});
      let response = await http_promise
      if(
        (
          response.type.startsWith("application/json") ||
          response.type.startsWith("text/json") ||
          response.type.startsWith("application/javascript")
        ) && (
          response.status == 200
        )
      )
  		  return JSON.parse(response.body).result

      console.log("Request failed.")
      console.log("Response Status", response.status)
      console.log("Response Type", response.type)
      console.log("Response from was not json. Waiting 15s and retrying. URL:", url)
      console.log("If this error continually occurs, may be due to too large of a block range for snapshot.")
      await sleep(15000);
      return await makeSynchronousRequest(url)
  	}
  	catch(error) {
  		console.error(error);
  	}
  }

  function getTransactionHashesComposer(
    _txsUriBuilder,
    _internalTxsUriBuilder,
    _getHashFromApiServiceTx,
    _apiServiceName //for logging only
  ) {
    return async (_address, _fromBlock, _toBlock) => {
      let txsFromApiService = await makeSynchronousRequest(
        _txsUriBuilder(_address, _fromBlock, _toBlock)
      )
      let internalTxsFromApiService = await makeSynchronousRequest(
        _internalTxsUriBuilder(_address, _fromBlock, _toBlock)
      )
      let txHashes = txsFromApiService.map(_getHashFromApiServiceTx)
      let internalTxHashes = internalTxsFromApiService.map(_getHashFromApiServiceTx)

      console.log('Address:',_address,'; Service:',_apiServiceName,'; Tx Hashes:',txHashes.length,'; Int Tx Hashes:', internalTxHashes.length);
      return { txHashes, internalTxHashes };
    }
  }

  function etherscanGetHashFromApiServiceTx(tx) {
    return tx.hash
  }

  function etherscanTxsUriBuilder(_address, _fromBlock, _toBlock) {
    return 'https://api.etherscan.io/api?module=account&action=txlist&address='
      +_address
      +'&startblock='+_fromBlock
      +'&endblock='+_toBlock
      +'&sort=asc&apikey='
      +EtherscanAPIToken
  }

  function etherscanInternalTxsUriBuilder(_address, _fromBlock, _toBlock) {
    return 'https://api.etherscan.io/api?module=account&action=txlistinternal&address='
      +_address
      +'&startblock='+_fromBlock
      +'&endblock='+_toBlock
      +'&sort=asc&apikey='
      +EtherscanAPIToken
  }

  function blockscoutGetHashFromApiServiceTx(tx) {
    if (typeof(tx.hash)!=='undefined')
      return tx.hash
    if (typeof(tx.transactionHash)!=='undefined')
      return tx.transactionHash
    console.log('Failed tx: ',tx)
    throw 'Neither tx.hash nor tx.transactionHash found in blockscout tx.'
  }

  function blockscoutTxsUriBuilder(_address, _fromBlock, _toBlock) {
    return 'https://blockscout.com/eth/mainnet/api?module=account&action=txlist&address='
      +_address
      +'&startblock='+_fromBlock
      +'&endblock='+_toBlock
      +'&sort=asc'
  }

  function blockscoutInternalTxsUriBuilder(_address, _fromBlock, _toBlock) {
    return 'https://blockscout.com/eth/mainnet/api?module=account&action=txlistinternal&address='
      +_address
      +'&startblock='+_fromBlock
      +'&endblock='+_toBlock
      +'&sort=asc'
  }

  function getTransactionsMultiApiComposer(
    _txHashApiServices
  ) {
    return async (_address,_fromBlock,_toBlock) => {
      let txHashesFromEachApi =
        await Promise.all(
          _txHashApiServices.map((func)=>func(_address,_fromBlock,_toBlock))
        )
      let txHashes = _.union(
        ...txHashesFromEachApi.map((apiHashes)=>apiHashes.txHashes)
      )
      let internalTxHashes = _.union(
        ...txHashesFromEachApi.map((apiHashes)=>apiHashes.internalTxHashes)
      )
      let txs = [], txsChunkIndex = 0;
      while(txHashes.length) {
          const txHashesChunk = txHashes.splice(0,100);
          await Promise.all(
            txHashesChunk.map(async (hash,index)=> {
              let keepTrying, txToPush;
              do {
                try {
                  console.log('Getting tx ', hash, 'for address', _address, (txsChunkIndex*100)+index)
                  txToPush = await web3.eth.getTransactionReceipt(hash);
                  keepTrying = false;
                } catch {
                  console.log(
                    'Getting tx ', hash, 'for address', _address, (txsChunkIndex*100)+index, 'failed... trying again.'
                  );
                  keepTrying = true;
                }
              } while (keepTrying)
              if (txToPush.logs)
                txToPush.logs = logDecoder.decodeLogs(txToPush.logs)
              txs.push(txToPush)
            })
          )
          await sleep(5000);
          txsChunkIndex ++;
      }
      let internalTxs = [], internalTxsChunkIndex = 0;
      while(internalTxHashes.length) {
          const internalTxHashesChunk = internalTxHashes.splice(0,100);
          await Promise.all(
            internalTxHashesChunk.map(async (hash,index)=> {
              let keepTrying, internalTxToPush;
              do {
                try {
                  console.log('Getting internal tx ', hash, 'for address', _address, (internalTxsChunkIndex*100)+index)
                  internalTxToPush = await web3.eth.getTransactionReceipt(hash);
                  keepTrying = false;
                } catch {
                  console.log(
                    'Getting internal tx ', hash, 'for address', _address, (internalTxsChunkIndex*100)+index, 'failed... trying again.'
                  );
                  keepTrying = true;
                }
              } while (keepTrying)
              if (internalTxToPush.logs)
                internalTxToPush.logs = logDecoder.decodeLogs(internalTxToPush.logs)
              internalTxs.push(internalTxToPush)
            })
          )
          await sleep(5000);
          internalTxsChunkIndex ++;
      }

      return {txs, internalTxs}
    }
  }

  let getBlockscoutTransactionHashes = getTransactionHashesComposer(
    blockscoutTxsUriBuilder,
    blockscoutInternalTxsUriBuilder,
    blockscoutGetHashFromApiServiceTx,
    "blockscout"
  )

  let getEtherscanTransactionHashes = getTransactionHashesComposer(
    etherscanTxsUriBuilder,
    etherscanInternalTxsUriBuilder,
    etherscanGetHashFromApiServiceTx,
    "etherscan"
  )
  let providers = []
  if (BlockCyperEtherscanToken)
    providers.push(getBlockscoutTransactionHashes)
  if (EtherscanAPIToken) 
    providers.push(getEtherscanTransactionHashes)
  let getTransactions = getTransactionsMultiApiComposer(providers);

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

  async function getPastEvents(contract, fromBlock, toBlock) {
    let events = [];
    while (toBlock - fromBlock > 999999) {
      events = events.concat(await genesisProtocol.getPastEvents(
        'allEvents', {fromBlock: fromBlock, toBlock: fromBlock + 999999}
      ))
      fromBlock = fromBlock + 1000000;
    }
    events = events.concat(await genesisProtocol.getPastEvents(
      'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
    ))
    return events;
  }
  
  console.log('Getting events info for controller')
  DXdaoTransactions.controller.events = DXdaoTransactions.controller.events.concat( await dxController.getPastEvents(
    'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
  ));
  console.log('Getting events info for avatar')
  DXdaoTransactions.avatar.events = DXdaoTransactions.avatar.events.concat( await dxAvatar.getPastEvents(
    'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
  ));
  console.log('Getting events info for token')
  DXdaoTransactions.token.events = DXdaoTransactions.token.events.concat(
    await dxToken.getPastEvents('allEvents', {fromBlock: fromBlock, toBlock: toBlock})
  );
  console.log('Getting events info for reputation')
  DXdaoTransactions.reputation.events = DXdaoTransactions.reputation.events.concat( await dxReputation.getPastEvents(
    'allEvents', {fromBlock: fromBlock, toBlock: toBlock}
  ));
  console.log('Getting events info for genesisProtocol')
  DXdaoTransactions.genesisProtocol.events = DXdaoTransactions.genesisProtocol.events.concat(
    await getPastEvents(genesisProtocol, fromBlock, toBlock)
  );

  console.log('Getting txs from schemes..')
  for (var schemeAddress in schemes) {
    console.log('Getting txs from scheme', schemeAddress);
    if (schemes.hasOwnProperty(schemeAddress)) {
      transactionsFetched = await getTransactions(schemeAddress, fromBlock, toBlock);
      if (!DXdaoTransactions.schemes[schemeAddress])
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
  console.log('Writing DXdaoTransactions file..');
  fs.writeFileSync('DXdaoTransactions.json', JSON.stringify(DXdaoTransactions, null, 2), {encoding:'utf8',flag:'w'});
}

Promise.all([main()]).then(process.exit);
