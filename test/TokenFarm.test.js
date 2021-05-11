
const DaiToken = artifacts.require('DaiToken')
const DappToken = artifacts.require('DappToken')
const TokenFarm = artifacts.require('TokenFarm')

require('chai')
    .use(require('chai-as-promised'))
    .should()

function tokens(n) {
    return web3.utils.toWei(n, 'ether');
}

contract('TokenFarm', ([owner, investor]) => {
    let daiToken, dappToken, tokenFarm

    before(async () => {
        // Load contracts
        daiToken = await DaiToken.new()
        dappToken = await DappToken.new()
        tokenFarm = await TokenFarm.new(dappToken.address, daiToken.address)

        // Transfer all Dapp tokens to token farm
        await dappToken.transfer(tokenFarm.address, tokens('1000000'))

        // Send 100 tokens to investor
        await daiToken.transfer(investor, tokens('100'), { from: owner })
    })

    describe('Mock DAI deployment', async () => {
        it('has a name', async () => {
            const name = await daiToken.name()
            assert.equal(name, 'Mock DAI Token')
        })
    })
    
    describe('Dapp Token deployment', async () => {
        it('has a name', async () => {
            const name = await dappToken.name()
            assert.equal(name, 'DApp Token')
        })
    })
    
    describe('Token Farm deployment', async () => {
        it('has a name', async () => {
            const name = await tokenFarm.name()
            assert.equal(name, 'Dapp Token Farm')
        })

        it('contract has tokens', async () => {
            const balance = await dappToken.balanceOf(tokenFarm.address)
            assert.equal(balance.toString(), tokens('1000000'))
        })
    })

    describe('Farming Tokens', async () => {
        it('Rewards investors for staking mDAI tokens', async () => {
            let result

            // Check investor balance before staking
            result = await daiToken.balanceOf(investor)
            assert.equal(result.toString(), tokens('100'), 'Investor mDai balance incorrect prior to staking')

            // Stake Mock DAI Tokens
            await daiToken.approve(tokenFarm.address, tokens('100'), { from: investor})
            await tokenFarm.stakeTokens(tokens('100'), { from: investor})

            // Check staking result
            result = await daiToken.balanceOf(investor)
            assert.equal(result.toString(), tokens('0'), 'Investor mDai balance incorrect after staking')

            result = await daiToken.balanceOf(tokenFarm.address)
            assert.equal(result.toString(), tokens('100'), `Contract balance of mDAI didn't increase`)

            result = await tokenFarm.stakingBalance(investor)
            assert.equal(result.toString(), tokens('100'), `Investor didn't stake properly`)

            result = await tokenFarm.isStaking(investor)
            assert.equal(result.toString(), 'true', `Investor is not marked as 'Staking'`)

            // Issue tokens
            await tokenFarm.issueTokens({ from: owner })

            // Check balances after issuance
            result = await dappToken.balanceOf(investor)
            assert.equal(result.toString(), tokens('100'), `Investor didn't get dappTokens reward`)

            // Ensure only contract owner can call the function
            await tokenFarm.issueTokens({ from: investor }).should.be.rejected

            // Unstake tokens by investor
            await tokenFarm.unstakeAllTokens({ from: investor })
            result = await daiToken.balanceOf(investor)
            assert.equal(result.toString(), tokens('100'), `Investor didn't unstake mDAI successfully`)
            
            result = await daiToken.balanceOf(tokenFarm.address)
            assert.equal(result.toString(), tokens('0'), `There should not be any mDAI left over`)

            result = await tokenFarm.stakingBalance(investor)
            assert.equal(result.toString(), tokens('0'), `Investor should not have any mDAI saked in the contract`)

            result = await tokenFarm.isStaking(investor)
            assert.equal(result.toString(), 'false', `Investor should not be marked as staking`)

            // Attempt unstaking by user with 0 balance
            await tokenFarm.unstakeAllTokens({ from: owner }).should.be.rejected
        })
    })
})