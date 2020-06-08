const fs = require('fs');
const Web3 = require('web3');
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades');
var _ = require('lodash');
const args = process.argv;
require('dotenv').config();

// Get network to use from arguments
let network, web3, reset=false, fast=false;
for (var i = 0; i < args.length; i++) {
  if (args[i] == '-network')
    network = args[i+1];
  if (args[i] == '-reset')
    reset = true;
  if (args[i] == '-fast')
    fast = true;
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

const contracts = require('../contracts.json');
const dxController = DxController.at(contracts.DxController);
const dxAvatar = DxAvatar.at(contracts.DxAvatar);
const dxReputation = DxReputation.at(contracts.DxReputation);
const dxToken = DxToken.at(contracts.DxToken);
const genesisProtocol = GenesisProtocol.at(contracts.GenesisProtocol);

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

// Fecth existent snapshot
let DXdaoSnapshot;
if (fs.existsSync('./DXdaoSnapshot.json') && !reset)
  DXdaoSnapshot = JSON.parse(fs.readFileSync('DXdaoSnapshot.json', 'utf-8'));

let DXdaoTransactions;
if (fs.existsSync('./DXdaoTransactions.json') && !reset)
  DXdaoTransactions = JSON.parse(fs.readFileSync('DXdaoTransactions.json', 'utf-8'));


async function main() {
  
  const fromBlock = DXdaoTransactions.fromBlock;
  const toBlock = DXdaoTransactions.toBlock;
  
  console.log('Generating snapshot from block', fromBlock, 'to block', toBlock);
  
  let history = {
    txs: [],
    internalTxs: [],
    events: []
  };
  
  history.txs = history.txs.concat(DXdaoTransactions.controller.txs);
  history.txs = history.txs.concat(DXdaoTransactions.avatar.txs);
  history.txs = history.txs.concat(DXdaoTransactions.reputation.txs);
  history.txs = history.txs.concat(DXdaoTransactions.token.txs);
  history.txs = history.txs.concat(DXdaoTransactions.genesisProtocol.txs);
  
  history.internalTxs = history.internalTxs.concat(DXdaoTransactions.controller.internalTxs);
  history.internalTxs = history.internalTxs.concat(DXdaoTransactions.avatar.internalTxs);
  history.internalTxs = history.internalTxs.concat(DXdaoTransactions.reputation.internalTxs);
  history.internalTxs = history.internalTxs.concat(DXdaoTransactions.token.internalTxs);
  history.internalTxs = history.internalTxs.concat(DXdaoTransactions.genesisProtocol.internalTxs);
  
  history.events = history.events.concat(DXdaoTransactions.controller.events);
  history.events = history.events.concat(DXdaoTransactions.avatar.events);
  history.events = history.events.concat(DXdaoTransactions.reputation.events);
  history.events = history.events.concat(DXdaoTransactions.token.events);
  history.events = history.events.concat(DXdaoTransactions.genesisProtocol.events);
  
  for (var schemeAddress in DXdaoTransactions.schemes) {
    if (DXdaoTransactions.schemes.hasOwnProperty(schemeAddress)) {
      history.txs = history.txs.concat(DXdaoTransactions.schemes[schemeAddress].txs);
      history.internalTxs = history.internalTxs.concat(DXdaoTransactions.schemes[schemeAddress].internalTxs);
      history.events = history.events.concat(DXdaoTransactions.schemes[schemeAddress].events);
    }
  }
  history.txs = _.uniqBy(history.txs, 'hash');
  history.txs = _.sortBy(history.txs, 'transactionIndex');
  history.txs = _.sortBy(history.txs, 'blockNumber');
  
  history.internalTxs = _.uniqBy(history.internalTxs, 'transactionHash');
  history.internalTxs = _.sortBy(history.internalTxs, 'transactionIndex');
  history.internalTxs = _.sortBy(history.internalTxs, 'blockNumber');
  
  const createProposalEvents = [
    'NewContributionProposal',
    'NewCallProposal',
    'NewSchemeProposal',
    'RemoveSchemeProposal'
  ];
  const endProposalEvents = [
    'ExecuteProposal',
    'ProposalDeleted',
    'ProposalExecuted',
    'ProposalExecutedByVotingMachine',
    'CancelProposal'
  ];
  
  history.events = _.sortBy(history.events, 'logIndex');
  history.events = _.sortBy(history.events, 'blockNumber');

  console.log('Total history txs:,', history.txs.length);
  console.log('Total history internal:', history.internalTxs.length);
  console.log('Total history events:', history.events.length);
  
  let registeredSchemes = [];
  let schemesActivePeriods = [];
  let schemeAddedBlock = {};
  
  console.log('Registered scheme in controller constructor', web3.utils.toChecksumAddress(DXdaoTransactions.controller.txs[0].from))
  registeredSchemes.push(web3.utils.toChecksumAddress(DXdaoTransactions.controller.txs[0].from));
  schemeAddedBlock[web3.utils.toChecksumAddress(DXdaoTransactions.controller.txs[0].from)] = DXdaoTransactions.controller.txs[0].blockNumber;
  
  history.events.forEach((historyEvent) => {
    if (historyEvent.event == 'RegisterScheme') {
      console.log('Registered scheme', historyEvent.returnValues._scheme)
      registeredSchemes.push(historyEvent.returnValues._scheme);
      schemeAddedBlock[historyEvent.returnValues._scheme] = historyEvent.blockNumber;
    } else if (historyEvent.event == 'UnregisterScheme'){
      if (registeredSchemes.indexOf(historyEvent.returnValues._scheme) < 0) {
        console.error('Unregister inexistent scheme', historyEvent.returnValues._scheme) 
      } else {
        console.log('Unregister scheme', historyEvent.returnValues._scheme)    
        schemesActivePeriods.push({
          address: historyEvent.returnValues._scheme,
          fromBlock: schemeAddedBlock[historyEvent.returnValues._scheme],
          toBlock: historyEvent.blockNumber
        })
        delete schemeAddedBlock[historyEvent.returnValues._scheme];
        registeredSchemes.splice(registeredSchemes.indexOf(historyEvent.returnValues._scheme), 1);
      }
    }
  });
  
  console.log('Active schemes:\n', registeredSchemes);

  for (var i = 0; i < registeredSchemes.length; i++) {
    schemesActivePeriods.push({
      address: registeredSchemes[i],
      fromBlock: schemeAddedBlock[registeredSchemes[i]],
      toBlock: 0
    })
    delete schemeAddedBlock[registeredSchemes[i]];
  }
  
  // TO DO: check schemeAddedBlock is empty object
  
  let schemesInfo = {};
  for (var i = 0; i < registeredSchemes.length; i++) {
    const scheme = await dxController.methods.schemes(registeredSchemes[i]).call();
  
    let activePeriods = schemesActivePeriods.filter((period) => {return period.address == registeredSchemes[i]});
  
    let permissions = {
      registered: (scheme.permissions == '0x0000001f'),
      manageSchemes: (scheme.permissions == '0x0000001f'),
      upgradeController: (scheme.permissions == '0x0000001f'),
      delegateCall: (scheme.permissions == '0x0000001f') || (scheme.permissions == '0x00000011'),
      globalConstraint: (scheme.permissions == '0x0000001f'),
      mintRep: (scheme.permissions == '0x0000001f') || (scheme.permissions == '0x00000011') || (scheme.permissions == '0x00000001')
    }
  
    // TO DO: Add analysis of global constrains of each scheme
  
    schemesInfo[registeredSchemes[i]] = { 
      name: schemes[registeredSchemes[i]] ? schemes[registeredSchemes[i]].schema.contractName : 'UnregisteredSchema',
      paramsHash: scheme.paramsHash,
      permissions: permissions,
      activePeriods: activePeriods,
      activeProposals: []
    };
  };
  let proposals = {};
  let activeProposals = [];
  history.events.forEach((historyEvent) => {
    if (createProposalEvents.indexOf(historyEvent.event) >= 0) {
      
      if (proposals[historyEvent.returnValues._proposalId])
        console.error('Proposal', historyEvent.returnValues._proposalId,' already added !');
      const proposalInfo = {
        contractName: schemes[historyEvent.address].schema.contractName,
        event: historyEvent,
        blockNumber: historyEvent.blockNumber,
        txHash: historyEvent.transactionHash,
        scheme: historyEvent.address,
        url: 'https://alchemy.daostack.io/dao/'+dxAvatar.address+'/proposal/'+historyEvent.returnValues._proposalId
      };
      
      proposals[historyEvent.returnValues._proposalId] = proposalInfo;
      activeProposals.push(historyEvent.returnValues._proposalId);
      schemesInfo[historyEvent.address].activeProposals.push(historyEvent.returnValues._proposalId);
      
    } else if (endProposalEvents.indexOf(historyEvent.event) >= 0) {
      
      if (activeProposals.indexOf(historyEvent.returnValues._proposalId) >= 0)
        activeProposals.splice(activeProposals.indexOf(historyEvent.returnValues._proposalId), 1);
      
      if (schemesInfo[historyEvent.address].activeProposals.indexOf(historyEvent.returnValues._proposalId) >= 0)
        schemesInfo[historyEvent.address].activeProposals.splice(schemesInfo[historyEvent.address].activeProposals
          .indexOf(historyEvent.returnValues._proposalId), 1);
    }
  });
  
  const ProposalState = ['None', 'ExpiredInQueue', 'Executed', 'Queued', 'PreBoosted', 'Boosted', 'QuietEndingPeriod']
  const WinningVoteState = ['NONE', 'YES', 'NO'];
  
  function removeNumberKeys(object) {
    for (var key in object) {
      if (object.hasOwnProperty(key)) {
        if (!isNaN(key)) delete object[key];
      }
    }
    return JSON.parse(JSON.stringify(object));
  }

  for (var proposalId in proposals) {
    if (proposals.hasOwnProperty(proposalId)) {
      console.log('Getting information of proposal', proposalId);
      proposals[proposalId].genesisProtocolData = removeNumberKeys(
        await genesisProtocol.methods.proposals(proposalId).call()
      );
      proposals[proposalId].genesisProtocolData.state = ProposalState[
        proposals[proposalId].genesisProtocolData.state
      ];
      proposals[proposalId].genesisProtocolData.winningVote = WinningVoteState[
        proposals[proposalId].genesisProtocolData.winningVote
      ];
      if (schemes[proposals[proposalId].scheme].methods.organizationsProposals){
        proposals[proposalId].proposalData = removeNumberKeys(
          await schemes[proposals[proposalId].scheme].methods
            .organizationsProposals(dxAvatar.address, proposalId).call()
        );
      } else if (schemes[proposals[proposalId].scheme].methods.organizationProposals) {
        proposals[proposalId].proposalData = removeNumberKeys(
          await schemes[proposals[proposalId].scheme].methods
          .organizationProposals(proposalId).call()
        );
      }
      if (schemes[proposals[proposalId].scheme].methods.contractToCall){
        proposals[proposalId].contractToCall = 
          await schemes[proposals[proposalId].scheme].methods.contractToCall().call();
      }
      if (proposals[proposalId].proposalData.callData) {
        proposals[proposalId].toSimulate = {
          to: dxController.address,
          from: proposals[proposalId].scheme,
          data: await dxController.methods
          .genericCall(
            proposals[proposalId].contractToCall,
            proposals[proposalId].proposalData.callData,
            dxAvatar.address,
            proposals[proposalId].proposalData.value
          ).encodeABI(),
          value: proposals[proposalId].proposalData.value
        }
      }
    }
  }

  console.log('Total proposals:\n', _.size(proposals));
  console.log('Total active proposals:\n', activeProposals.length);
  for (var schemeAddress in schemesInfo) {
    if (schemesInfo.hasOwnProperty(schemeAddress) && schemesInfo[schemeAddress].activeProposals.length > 0) {
      console.log('Scheme',schemesInfo[schemeAddress].name, 'has ', schemesInfo[schemeAddress].activeProposals.length, 'active proposals');
    }
  }
  
  for (var proposalId in proposals) {
    if (proposals.hasOwnProperty(proposalId)
    && (proposals[proposalId].genesisProtocolData.state != 'ExpiredInQueue')
    && (proposals[proposalId].genesisProtocolData.state != 'Executed')
    && (proposals[proposalId].toSimulate)) {
      console.log('Generic proposal', proposalId, 'in',schemesInfo[proposals[proposalId].scheme].name,'active to simulate \n', proposals[proposalId].toSimulate);
    }
  }
  
  DXdaoSnapshot.schemesInfo = schemesInfo;
  DXdaoSnapshot.proposals = proposals;
  DXdaoSnapshot.activeProposals = activeProposals;
  
  fs.writeFileSync('DXdaoSnapshot.json', JSON.stringify(DXdaoSnapshot, null, 2), {encoding:'utf8',flag:'w'});
} 

Promise.all([main()]).then(process.exit);
