const fs = require("fs");
const hre = require("hardhat");
const web3 = hre.web3;
const { Contracts, ZWeb3 } = require("@openzeppelin/upgrades");
var _ = require("lodash");
const args = process.argv;
require("dotenv").config();
const fetch = require('node-fetch');
const TENDERLY_API_KEY = process.env.KEY_TENDERLY ;

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
  activeProposals: []
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

  let schemesInfo = DXdaoSnapshot.schemesInfo;
  let proposals = DXdaoSnapshot.proposals;
  let activeProposals = DXdaoSnapshot.activeProposals;
  
  // TO DO: check schemeAddedBlock is empty object
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
    if (!schemesInfo[registeredSchemes[i]])
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
  const proposalsToCheck = proposalsIds.filter((proposalId)=> {
    return (!proposals[proposalId].genesisProtocolData || activeProposals.indexOf(proposalId) >= 0)
  })
  while(proposalsToCheck.length) {
    const proposalsIdsChunk = proposalsToCheck.splice(0,10);
    await Promise.all(
      proposalsIdsChunk.map(async (proposalId,index)=> {
        let keepTrying;
        do {
          try {
            console.log("Getting information of proposal", proposalId, (proposalsIdsChunkIndex*10)+index+1)
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
              proposals[proposalId].toSimulate = [];
              for (var i = 0; i < proposals[proposalId].event.returnValues._contractsToCall.length; i++)
                proposals[proposalId].toSimulate.push({
                  to: proposals[proposalId].event.returnValues._contractsToCall[i],
                  from: dxAvatar.address,
                  data: proposals[proposalId].event.returnValues._callsData[i],
                  value: proposals[proposalId].event.returnValues._values[i],
                });
            } else if (proposals[proposalId].contractToCall && proposals[proposalId].proposalData.callData) {
              proposals[proposalId].toSimulate = {
                to: proposals[proposalId].contractToCall,
                from: dxAvatar.address,
                data: proposals[proposalId].proposalData.callData,
                value: proposals[proposalId].proposalData.value,
              };
            }

            keepTrying = false;
          } catch(e) {
            console.error(e);
            console.log(
              "Getting information of proposal", proposalId, (proposalsIdsChunkIndex*10)+index+1, 'failed... trying again.'
            );
            await sleep(100);
            keepTrying = true;
          }
        } while (keepTrying)
      })
    )
    await sleep(100);
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

  if (TENDERLY_API_KEY)
  for (var i = 0; i < activeProposals.length; i++) {
    if (proposals[activeProposals[i]].scheme == contracts.schemes.GenericSchemeMultiCall) {
      console.log(proposals[activeProposals[i]].toSimulate)
      for (var callIndex = 0; callIndex < proposals[activeProposals[i]].toSimulate.length; callIndex++) {
        const callToExecute = proposals[activeProposals[i]].toSimulate[callIndex];
        const simulationResponse = await fetch('https://api.tenderly.co/api/v1/account/me/project/dxdao-proposal-simulation/simulate', 
          {
            method: 'post',
            body:    JSON.stringify({
              "network_id": "1",
              "from": callToExecute.from,
              "to": callToExecute.to,
              "input": callToExecute.data,
              "gas": 1000000,
              "gas_price": 0,
              "value": callToExecute.value,
              "save": true,
          		"save_if_fails": false
            }),
            headers: { 'X-Access-Key': TENDERLY_API_KEY },
          }
        );
        const simulationResult = await simulationResponse.json();
        console.log(
          "Call", callIndex, " in proposal", activeProposals[i], "in",
          schemesInfo[proposals[activeProposals[i]].scheme].name,
          (!simulationResult.simulation.status) ? "SIMULATION FAILED" : "simulation succeded",
          "https://dashboard.tenderly.co/public/dxdao/dxdao-proposal-simulation/simulator/"+simulationResult.simulation.id
        );
      }
    } else if (proposals[activeProposals[i]].toSimulate) {
      const simulationResult = await fetch('https://api.tenderly.co/api/v1/account/me/project/dxdao-proposal-simulation/simulate', 
        {
          method: 'post',
          body:    JSON.stringify({
            "network_id": "1",
            "from": proposals[activeProposals[i]].toSimulate.from,
            "to": proposals[activeProposals[i]].toSimulate.to,
            "input": proposals[activeProposals[i]].toSimulate.data,
            "gas": 1000000,
            "gas_price": 0,
            "value": proposals[activeProposals[i]].toSimulate.value,
            "save": true,
            "save_if_fails": false
          }),
          headers: { 'X-Access-Key': TENDERLY_API_KEY },
        }
      )
      .then(res => res.json())
      .then(json => {return json});
      console.log(
        "Call", c, " in proposal", activeProposals[i], "in",
        schemesInfo[proposals[activeProposals[i]].scheme].name,
        (!simulationResult.simulation.status) ? "SIMULATION FAILED" : "simulation succeded",
        "https://dashboard.tenderly.co/public/dxdao/dxdao-proposal-simulation/simulator/"+simulationResult.simulation.id
      );
    }
  }

  DXdaoSnapshot.schemesInfo = schemesInfo;
  DXdaoSnapshot.proposals = proposals;
  DXdaoSnapshot.activeProposals = activeProposals;

  fs.writeFileSync("DXdaoSnapshot.json", JSON.stringify(DXdaoSnapshot, null, 2), { encoding: "utf8", flag: "w" });
}

Promise.all([main()]).then(process.exit);
