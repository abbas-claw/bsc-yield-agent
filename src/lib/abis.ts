// Minimal ABIs for Venus and Aave V3 on BSC

export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

// Venus Comptroller (Unitroller proxy)
export const VENUS_COMPTROLLER_ABI = [
  'function getAllMarkets() view returns (address[])',
  'function markets(address vToken) view returns (bool isListed, uint256 collateralFactorMantissa, bool isVenus)',
  'function getAccountLiquidity(address account) view returns (uint256 error, uint256 liquidity, uint256 shortfall)',
  'function enterMarkets(address[] vTokens) returns (uint256[])',
  'function exitMarket(address vToken) returns (uint256)',
  'function claimVenus(address holder)',
  'function claimVenus(address holder, address[] vTokens)',
  'function venusAccrued(address holder) view returns (uint256)',
  'function mintGuardianPaused(address vToken) view returns (bool)',
  'function borrowGuardianPaused(address vToken) view returns (bool)',
  'function venusSupplySpeeds(address vToken) view returns (uint256)',
  'function venusBorrowSpeeds(address vToken) view returns (uint256)',
  'function oracle() view returns (address)',
  'function closeFactorMantissa() view returns (uint256)',
  'function liquidationIncentiveMantissa() view returns (uint256)',
];

// Venus vToken (VBep20)
export const VENUS_VTOKEN_ABI = [
  'function mint(uint256 mintAmount) returns (uint256)',
  'function mint() payable',  // For vBNB
  'function redeem(uint256 redeemTokens) returns (uint256)',
  'function redeemUnderlying(uint256 redeemAmount) returns (uint256)',
  'function borrow(uint256 borrowAmount) returns (uint256)',
  'function repayBorrow(uint256 repayAmount) returns (uint256)',
  'function repayBorrow() payable',  // For vBNB
  'function balanceOf(address owner) view returns (uint256)',
  'function balanceOfUnderlying(address owner) returns (uint256)',
  'function borrowBalanceCurrent(address account) returns (uint256)',
  'function borrowBalanceStored(address account) view returns (uint256)',
  'function exchangeRateCurrent() returns (uint256)',
  'function exchangeRateStored() view returns (uint256)',
  'function getCash() view returns (uint256)',
  'function totalBorrows() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function totalReserves() view returns (uint256)',
  'function reserveFactorMantissa() view returns (uint256)',
  'function supplyRatePerBlock() view returns (uint256)',
  'function borrowRatePerBlock() view returns (uint256)',
  'function underlying() view returns (address)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function getAccountSnapshot(address account) view returns (uint256, uint256, uint256, uint256)',
];

// Venus Oracle
export const VENUS_ORACLE_ABI = [
  'function getUnderlyingPrice(address vToken) view returns (uint256)',
];

// Aave V3 Pool
export const AAVE_POOL_ABI = [
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function withdraw(address asset, uint256 amount, address to) returns (uint256)',
  'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)',
  'function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) returns (uint256)',
  'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
  'function getReserveData(address asset) view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function getReservesList() view returns (address[])',
  'function setUserUseReserveAsCollateral(address asset, bool useAsCollateral)',
];

// Aave V3 Pool Data Provider
export const AAVE_DATA_PROVIDER_ABI = [
  'function getReserveConfigurationData(address asset) view returns (uint256 decimals, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, uint256 reserveFactor, bool usageAsCollateralEnabled, bool borrowingEnabled, bool stableBorrowRateEnabled, bool isActive, bool isFrozen)',
  'function getUserReserveData(address asset, address user) view returns (uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)',
  'function getReserveTokensAddresses(address asset) view returns (address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress)',
  'function getAllReservesTokens() view returns (tuple(string symbol, address tokenAddress)[])',
  'function getReserveData(address asset) view returns (uint256 unbacked, uint256 accruedToTreasuryScaled, uint256 totalAToken, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)',
];

// Aave V3 Oracle
export const AAVE_ORACLE_ABI = [
  'function getAssetPrice(address asset) view returns (uint256)',
  'function getAssetsPrices(address[] assets) view returns (uint256[])',
  'function BASE_CURRENCY_UNIT() view returns (uint256)',
];

// Aave V3 Incentives Controller
export const AAVE_INCENTIVES_ABI = [
  'function claimAllRewards(address[] assets, address to) returns (address[] rewardsList, uint256[] claimedAmounts)',
  'function claimAllRewardsToSelf(address[] assets) returns (address[] rewardsList, uint256[] claimedAmounts)',
  'function getUserRewards(address[] assets, address user, address reward) view returns (uint256)',
  'function getAllUserRewards(address[] assets, address user) view returns (address[] rewardsList, uint256[] unclaimedAmounts)',
];

// WBNB for wrapping/unwrapping
export const WBNB_ABI = [
  'function deposit() payable',
  'function withdraw(uint256 wad)',
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];
