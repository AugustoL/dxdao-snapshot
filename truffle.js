require('dotenv').config();

infuraApiKey = process.env.KEY_INFURA_API_KEY;

module.exports = {	
  networks: {	
    develop: {	
      network_id: '66',	
      host: 'localhost',	
      port: 8545,	
      gas: 9000000,	
      gasPrice: 10000000000 //10 Gwei	
    },	
    mainnet: {	
      provider: `https://mainnet.infura.io/v3/${infuraApiKey}`,
      network_id: '1',	
      gas: 9000000,	
      gasPrice: 10000000000 //10 Gwei	
    },	
    rinkeby: {	
      provider: `https://mainnet.infura.io/v3/${infuraApiKey}`,
      network_id: '4',	
      gas: 9000000,	
      gasPrice: 10000000000 //10 Gwei	
    },	
    ropsten: {	
      provider: `https://mainnet.infura.io/v3/${infuraApiKey}`,
      network_id: '3',	
      gas: 8000000,	
      gasPrice: 10000000000 //10 Gwei	
    },	
    kovan: {	
      provider: `https://mainnet.infura.io/v3/${infuraApiKey}`,
      network_id: '42',	
      gas: 9000000,	
      gasPrice: 10000000000 //10 Gwei	
    }	
  },	
  build: {},	
  compilers: {	
    solc: {	
      version: '^0.5.13',
      settings: {
        evmVersion: 'constantinople',
      }
    }
  },	
  solc: {	
    optimizer: {	
      enabled: true,	
      runs: 200	
    }
  },	
}
