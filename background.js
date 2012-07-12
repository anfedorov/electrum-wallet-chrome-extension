var sh = StratumHandler(),
    rpc = JSONRPCoverHTTP(config.server_address),
    km = KeyManager(),
    wallet = ElectrumWallet(km),
    ui = UI(wallet, rpc).init();

sh.init(rpc, wallet, ui);
rpc.init(sh.handle_response);

rpc.go();
if (km.isReady()) wallet.extendAddressChain();
