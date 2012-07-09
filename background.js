var sh = StratumHandler(),
    rpc = JSONRPCoverHTTP(config.server_address+":8081"),
    km = KeyManager(),
    wallet = ElectrumWallet(km),
    ui = UI(wallet, rpc).init();

sh.init(rpc, wallet, ui);
rpc.init(sh.handle_response);

rpc.go();
wallet.extendAddressChain();
