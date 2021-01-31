const fs = require("fs");
const hre = require("hardhat");
const web3 = hre.web3;
const { Contracts, ZWeb3 } = require("@openzeppelin/upgrades");
var _ = require("lodash");
const args = process.argv;
require("dotenv").config();

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const EtherscanAPIToken = process.env.KEY_ETHERSCAN
const BlockCyperEtherscanToken = process.env.KEY_BLOCKCYPHER
console.log('Running information script on', hre.network.config.url)
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

const contracts = require("../contracts.json");
const schemeNames = _.invert(contracts.schemes);

let DXdaoTransactions;
if (fs.existsSync("./DXdaoTransactions.json")) {
  DXdaoTransactions = JSON.parse(
    fs.readFileSync("DXdaoTransactions.json", "utf-8")
  );
} else {
  throw('DXdaoTransactions.json file missing');
}

// Fecth existent snapshot
let DXdaoSnapshotTemplate = {
  schemesInfo: {},
  proposals: {},
  activeProposals: {}
}
// Fecth existent snapshot file
let DXdaoSnapshot = DXdaoSnapshotTemplate;
  if (fs.existsSync('./DXdaoSnapshot.json'))
    DXdaoSnapshot = Object.assign(DXdaoSnapshotTemplate, JSON.parse(fs.readFileSync('DXdaoSnapshot.json', 'utf-8')));

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
  schemes[contracts.schemes.GenericSchemeMultiCall] = await GenericSchemeMultiCall.at(contracts.schemes.GenericSchemeMultiCall);
  schemes[contracts.schemes.TokenRegistry] = await TokenRegistry.at(contracts.schemes.TokenRegistry);
  schemes[contracts.schemes.EnsPublicResolverScheme] = await EnsPublicProviderScheme.at(contracts.schemes.EnsPublicResolverScheme);
  
  // Set last confirmed block as toBlock
  const fromBlock = DXdaoTransactions.fromBlock;
  const toBlock = DXdaoTransactions.toBlock;
  
  const createProposalEvents = [
    "NewContributionProposal",
    "NewCallProposal",
    "NewMultiCallProposal",
    "NewSchemeProposal",
    "RemoveSchemeProposal",
  ];
  const endProposalEvents = [
    "ExecuteProposal",
    "ProposalDeleted",
    "ProposalExecuted",
    "ProposalExecutedByVotingMachine",
    "CancelProposal",
  ];
  const ProposalState = [
    "None",
    "ExpiredInQueue",
    "Executed",
    "Queued",
    "PreBoosted",
    "Boosted",
    "QuietEndingPeriod",
  ];
  const WinningVoteState = ["NONE", "YES", "NO"];

  console.log("Generating snapshot from block", fromBlock, "to block", toBlock);

  let history = {
    txs: [],
    internalTxs: [],
    events: [],
  };

  history.txs = history.txs.concat(DXdaoTransactions.controller.txs);
  history.txs = history.txs.concat(DXdaoTransactions.avatar.txs);
  history.txs = history.txs.concat(DXdaoTransactions.reputation.txs);
  history.txs = history.txs.concat(DXdaoTransactions.token.txs);
  history.txs = history.txs.concat(DXdaoTransactions.genesisProtocol.txs);

  history.internalTxs = history.internalTxs.concat(
    DXdaoTransactions.controller.internalTxs
  );
  history.internalTxs = history.internalTxs.concat(
    DXdaoTransactions.avatar.internalTxs
  );
  history.internalTxs = history.internalTxs.concat(
    DXdaoTransactions.reputation.internalTxs
  );
  history.internalTxs = history.internalTxs.concat(
    DXdaoTransactions.token.internalTxs
  );
  history.internalTxs = history.internalTxs.concat(DXdaoTransactions.genesisProtocol.internalTxs);

  history.events = history.events.concat(DXdaoTransactions.controller.events);
  history.events = history.events.concat(DXdaoTransactions.avatar.events);
  history.events = history.events.concat(DXdaoTransactions.reputation.events);
  history.events = history.events.concat(DXdaoTransactions.token.events);
  history.events = history.events.concat(DXdaoTransactions.genesisProtocol.events);

  for (var schemeAddress in DXdaoTransactions.schemes) {
    if (DXdaoTransactions.schemes.hasOwnProperty(schemeAddress)) {
      history.txs = history.txs.concat(
        DXdaoTransactions.schemes[schemeAddress].txs
      );
      history.internalTxs = history.internalTxs.concat(
        DXdaoTransactions.schemes[schemeAddress].internalTxs
      );
      history.events = history.events.concat(
        DXdaoTransactions.schemes[schemeAddress].events
      );
    }
  }
  history.txs = _.uniqBy(history.txs, "hash");
  history.txs = _.sortBy(history.txs, "transactionIndex");
  history.txs = _.sortBy(history.txs, "blockNumber");

  history.internalTxs = _.sortBy(history.internalTxs, "transactionIndex");
  history.internalTxs = _.sortBy(history.internalTxs, "blockNumber");

  history.events = _.sortBy(history.events, "logIndex");
  history.events = _.sortBy(history.events, "blockNumber");

  console.log("Total history txs:,", history.txs.length);
  console.log("Total history internal:", history.internalTxs.length);
  console.log("Total history events:", history.events.length);

  let registeredSchemes = [];
  let schemesActivePeriods = [];
  let schemeAddedBlock = {};

  console.log(
    "Registered scheme in controller constructor",
    web3.utils.toChecksumAddress(DXdaoTransactions.controller.txs[0].from)
  );
  registeredSchemes.push(
    web3.utils.toChecksumAddress(DXdaoTransactions.controller.txs[0].from)
  );
  schemeAddedBlock[
    web3.utils.toChecksumAddress(DXdaoTransactions.controller.txs[0].from)
  ] = DXdaoTransactions.controller.txs[0].blockNumber;

  history.events.forEach((historyEvent) => {
    if (historyEvent.event == "RegisterScheme") {
      console.log("Registered scheme", historyEvent.returnValues._scheme);
      registeredSchemes.push(historyEvent.returnValues._scheme);
      schemeAddedBlock[historyEvent.returnValues._scheme] =
        historyEvent.blockNumber;
    } else if (historyEvent.event == "UnregisterScheme") {
      if (registeredSchemes.indexOf(historyEvent.returnValues._scheme) < 0) {
        console.error(
          "Unregister inexistent scheme",
          historyEvent.returnValues._scheme
        );
      } else {
        console.log("Unregister scheme", historyEvent.returnValues._scheme);
        schemesActivePeriods.push({
          address: historyEvent.returnValues._scheme,
          fromBlock: schemeAddedBlock[historyEvent.returnValues._scheme],
          toBlock: historyEvent.blockNumber,
        });
        delete schemeAddedBlock[historyEvent.returnValues._scheme];
        registeredSchemes.splice(
          registeredSchemes.indexOf(historyEvent.returnValues._scheme),
          1
        );
      }
    }
  });

  console.log("Active schemes:\n", registeredSchemes);

  for (var i = 0; i < registeredSchemes.length; i++) {
    schemesActivePeriods.push({
      address: registeredSchemes[i],
      fromBlock: schemeAddedBlock[registeredSchemes[i]],
      toBlock: 0,
    });
    delete schemeAddedBlock[registeredSchemes[i]];
  }

  // TO DO: check schemeAddedBlock is empty object
  let schemesInfo = {};
  for (var i = 0; i < registeredSchemes.length; i++) {
    const scheme = await dxController.schemes(registeredSchemes[i]);

    let activePeriods = schemesActivePeriods.filter((period) => {
      return period.address == registeredSchemes[i];
    });

    let permissions = {
      registered: scheme.permissions == "0x0000001f",
      manageSchemes: scheme.permissions == "0x0000001f",
      upgradeController: scheme.permissions == "0x0000001f",
      delegateCall:
        scheme.permissions == "0x0000001f" ||
        scheme.permissions == "0x00000011",
      globalConstraint: scheme.permissions == "0x0000001f",
      mintRep:
        scheme.permissions == "0x0000001f" ||
        scheme.permissions == "0x00000011" ||
        scheme.permissions == "0x00000001",
    };

    // TO DO: Add analysis of global constrains of each scheme

    schemesInfo[registeredSchemes[i]] = {
      name: schemes[registeredSchemes[i]]
        ? schemeNames[registeredSchemes[i]]
        : "UnregisteredScheme",
      paramsHash: scheme.paramsHash,
      permissions: permissions,
      activePeriods: activePeriods,
      activeProposals: [],
    };
  }
  let proposals = {};
  let activeProposals = [];
  const schemesEvents = _.filter(history.events, function(o) { return schemeNames[o.address] });
  schemesEvents.forEach((historyEvent) => {
    if (
      createProposalEvents.indexOf(historyEvent.event) >= 0
      && activeProposals.indexOf(historyEvent.returnValues._proposalId) < 0
      && !proposals[historyEvent.returnValues._proposalId]
    ) {
      const proposalInfo = {
        contractName: schemeNames[historyEvent.address],
        event: historyEvent,
        blockNumber: historyEvent.blockNumber,
        txHash: historyEvent.transactionHash,
        scheme: historyEvent.address,
        url:
          "https://alchemy.daostack.io/dao/" +
          dxAvatar.address +
          "/proposal/" +
          historyEvent.returnValues._proposalId,
      };

      proposals[historyEvent.returnValues._proposalId] = proposalInfo;
      activeProposals.push(historyEvent.returnValues._proposalId);
      schemesInfo[historyEvent.address].activeProposals.push(
        historyEvent.returnValues._proposalId
      );
    } else if (endProposalEvents.indexOf(historyEvent.event) >= 0) {
      if (activeProposals.indexOf(historyEvent.returnValues._proposalId) >= 0)
        activeProposals.splice(
          activeProposals.indexOf(historyEvent.returnValues._proposalId),
          1
        );
      if (schemesInfo[historyEvent.address].activeProposals.indexOf(historyEvent.returnValues._proposalId) >= 0)
        schemesInfo[historyEvent.address].activeProposals.splice(
          schemesInfo[historyEvent.address].activeProposals.indexOf(historyEvent.returnValues._proposalId), 1
        );
    }
  });

  function removeNumberKeys(object) {
    for (var key in object) {
      if (object.hasOwnProperty(key)) {
        if (!isNaN(key)) delete object[key];
      }
    }
    return JSON.parse(JSON.stringify(object));
  }

  let proposalsIds = Object.keys(proposals), proposalsIdsChunkIndex = 0;
  while(proposalsIds.length) {
    const proposalsIdsChunk = proposalsIds.splice(0,10);
    await Promise.all(
      proposalsIdsChunk.map(async (proposalId,index)=> {
        let keepTrying;
        if (!DXdaoSnapshot.proposals[proposalId] || DXdaoSnapshot.activeProposals.indexOf(proposalId) >= 0)
          do {
            try {
              console.log("Getting information of proposal", proposalId, (proposalsIdsChunkIndex*10)+index)
              proposals[proposalId].genesisProtocolData = removeNumberKeys(
                await genesisProtocol.proposals(proposalId)
              );
              proposals[proposalId].genesisProtocolData.state =
                ProposalState[proposals[proposalId].genesisProtocolData.state];
              proposals[proposalId].genesisProtocolData.winningVote =
                WinningVoteState[proposals[proposalId].genesisProtocolData.winningVote];
              if (schemes[proposals[proposalId].scheme].organizationsProposals) {
                proposals[proposalId].proposalData = removeNumberKeys(
                  await schemes[proposals[proposalId].scheme].organizationsProposals(dxAvatar.address, proposalId)
                );
              } else if (schemes[proposals[proposalId].scheme].organizationProposals) {
                proposals[proposalId].proposalData = removeNumberKeys(
                  await schemes[proposals[proposalId].scheme].organizationProposals(proposalId)
                );
              } else if (schemes[proposals[proposalId].scheme].proposals) {
                proposals[proposalId].proposalData = removeNumberKeys(
                  await schemes[proposals[proposalId].scheme].proposals(proposalId)
                );
              }
              if (schemes[proposals[proposalId].scheme].contractToCall) {
                proposals[proposalId].contractToCall = await schemes[
                  proposals[proposalId].scheme
                ].contractToCall();
              }
              if (proposals[proposalId].scheme == contracts.schemes.GenericSchemeMultiCall) {
                // proposals[proposalId].toSimulate = {
                //   to: dxController.proposalData.contractsToCall,
                //   from: dxAvatar.address,
                //   data: "0x",
                //   value: "0"
                // };
              } else if (proposals[proposalId].proposalData.callData) {
                proposals[proposalId].toSimulate = {
                  to: dxAvatar.address,
                  from: proposals[proposalId].scheme,
                  data: web3.eth.abi.encodeFunctionCall({
                    name: 'genericCall',
                    type: 'function',
                    inputs: [{
                        type: 'address',
                        name: '_contract'
                    },{
                        type: 'bytes',
                        name: '_data'
                    },{
                        type: 'address',
                        name: '_avatar'
                    },{
                        type: 'uint256',
                        name: '_value'
                    }]
                  }, [
                    proposals[proposalId].contractToCall,
                    proposals[proposalId].proposalData.callData,
                    dxAvatar.address,
                    proposals[proposalId].proposalData.value
                  ]),
                  value: proposals[proposalId].proposalData.value,
                };
              }

              keepTrying = false;
            } catch(e) {
              console.error(e);
              console.log(
                "Getting information of proposal", proposalId, (proposalsIdsChunkIndex*100)+index, 'failed... trying again.'
              );
              await sleep(100);
              keepTrying = true;
            }
          } while (keepTrying)
        
      })
    )
    await sleep(5000);
    proposalsIdsChunkIndex ++;
  }

  console.log("Total proposals:\n", _.size(proposals));
  console.log("Total active proposals:\n", activeProposals.length);
  for (var schemeAddress in schemesInfo) {
    if (
      schemesInfo.hasOwnProperty(schemeAddress) &&
      schemesInfo[schemeAddress].activeProposals.length > 0
    ) {
      console.log(
        "Scheme",
        schemesInfo[schemeAddress].name,
        "has ",
        schemesInfo[schemeAddress].activeProposals.length,
        "active proposals"
      );
    }
  }

  proposalsIds.map(async (proposalId, index)=>{
    if (
      proposals.hasOwnProperty(proposalId) &&
      proposals[proposalId].genesisProtocolData.state != "ExpiredInQueue" &&
      proposals[proposalId].genesisProtocolData.state != "Executed" &&
      proposals[proposalId].toSimulate
    ) {
      console.log(
        "Proposal",
        proposalId,
        "in",
        schemesInfo[proposals[proposalId].scheme].name,
        "active to simulate \n",
        proposals[proposalId].toSimulate
      );
    }
  })

  DXdaoSnapshot.schemesInfo = schemesInfo;
  DXdaoSnapshot.proposals = proposals;
  DXdaoSnapshot.activeProposals = activeProposals;

  fs.writeFileSync("DXdaoSnapshot.json", JSON.stringify(DXdaoSnapshot, null, 2), { encoding: "utf8", flag: "w" });
}

Promise.all([main()]).then(process.exit);
