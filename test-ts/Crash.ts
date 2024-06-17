import { expect } from "chai";
import hre from "hardhat";

import {
	PublicClient,
	WalletClient,
	Account,
	parseUnits,
	formatUnits,
	zeroAddress,
} from "viem";

describe("Crash", () => {
	let crashContract: any;
	let owner: WalletClient;
	let agent: WalletClient;
	let user1: WalletClient;
	let publicClient: PublicClient;

	const coins = {
		weth: {
			contract: null,
			coinId: 1
		}
	}

	const contractAs = async (
		wallet: Account,
		contractName: string = 'Crash',
		contract: Contract = crashContract
	) => {
		return await hre.viem.getContractAt(
			contractName,
			contract.address,
			{ client: { wallet } }
		);
	}

	describe('Deployment', () => {
		it('Should set up the contract', async () => {
			[owner, agent, user1] = await hre.viem.getWalletClients();
			publicClient = await hre.viem.getPublicClient();
			crashContract = await hre.viem.deployContract("Crash", [zeroAddress], {});
		});

		it('Should set the agent address', async () => {
			await crashContract.write.setAgentAddress([agent.account?.address]);
			const newAddress = await crashContract.read.agentAddress();
			expect(newAddress.toLowerCase()).to.equal(agent.account?.address.toLowerCase());
		});

		it('Should deploy a mock WETH contract', async () => {
			coins.weth.contract = await hre.viem.deployContract("WETHToken", [], {});
		});

		it('Should configure WETH as a supported coin', async () => {
			await crashContract.write.addCoin([coins.weth.coinId, coins.weth?.contract?.address]);
			const coinAddress = await crashContract.read.supportedCoins([ coins.weth.coinId ]);
			expect(coinAddress.toLowerCase()).to.equal(coins.weth.contract.address.toLowerCase());
		});
	});

	describe('Set up user', () => {
		it('Should give user some WETH', async () => {
			const amount = '10';

			await coins.weth.contract.write.transfer([ user1.account.address, parseUnits(amount, 18) ]);

			const newBalance = await coins.weth.contract.read.balanceOf([ user1.account.address ]);

			expect(formatUnits(newBalance, 18)).to.equal(amount);
		});
	});

	describe('User interaction', () => {
		it('Should deposit tokens to the contract', async () => {
			const contractAsUser1 = await contractAs(user1);
			const wethAsUser1 = await contractAs(user1, "WETHToken", coins.weth.contract);

			const amount = '0.01';

			await wethAsUser1.write.approve([ crashContract.address, parseUnits(amount, 18) ]);

			await contractAsUser1.write.deposit([coins.weth.coinId, parseUnits(amount, 18) ]);
		});
	});
});