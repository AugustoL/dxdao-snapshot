require('dotenv').config();
require('@nomiclabs/hardhat-truffle5');

const INFURA_PROJECT_ID = process.env.KEY_INFURA_API_KEY;

module.exports = {
  solidity: {
    version: '0.5.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  gasReporter: {
    currency: 'USD',
    enabled: process.env.ENABLE_GAS_REPORTER === 'true'
  },
  networks: {
    hardhat: {
      gasPrice: 10000000000, // 10 gwei
      timeout: 60000
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
      timeout: 60000
    }
  }
};
