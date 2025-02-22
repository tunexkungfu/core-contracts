import { Deployer, Reporter } from "@solarity/hardhat-migrate";

import {
  EquityKYCCompliance__factory,
  EquityRarimoModule__factory,
  EquityRegulatoryCompliance__factory,
  EquityToken__factory,
  EquityTransferLimitsModule__factory,
  KYCCompliance,
  KYCCompliance__factory,
  RarimoSBT__factory,
  RegulatoryCompliance,
  RegulatoryCompliance__factory,
} from "../generated-types/ethers";

import { ethers } from "hardhat";

export = async (deployer: Deployer) => {
  const [_, ...agents] = await ethers.getSigners();

  const equityToken = await deployer.deploy(EquityToken__factory);
  const equityKYCCompliance = await deployer.deploy(EquityKYCCompliance__factory);
  const equityRegulatoryCompliance = await deployer.deploy(EquityRegulatoryCompliance__factory);

  await equityToken.__EquityToken_init(
    await equityRegulatoryCompliance.getAddress(),
    await equityKYCCompliance.getAddress(),
    equityRegulatoryCompliance.interface.encodeFunctionData("__EquityRegulatoryCompliance_init"),
    equityKYCCompliance.interface.encodeFunctionData("__EquityKYCCompliance_init"),
  );

  await equityToken.grantRole(await equityToken.AGENT_ROLE(), agents[0]);

  const equityTransferLimitsModule = await deployer.deploy(EquityTransferLimitsModule__factory);

  const equityRarimoModule = await deployer.deploy(EquityRarimoModule__factory);
  const rarimoSBT = await deployer.deploy(RarimoSBT__factory);

  await equityTransferLimitsModule.__EquityTransferLimitsModule_init(await equityToken.getAddress());

  await rarimoSBT.__RarimoSBT_init();
  await equityRarimoModule.__EquityRarimoModule_init(await equityToken.getAddress(), await rarimoSBT.getAddress());

  await (equityKYCCompliance.attach(equityToken) as KYCCompliance)
    .connect(agents[0])
    .addKYCModules([await equityRarimoModule.getAddress()]);
  await (equityRegulatoryCompliance.attach(equityToken) as RegulatoryCompliance)
    .connect(agents[0])
    .addRegulatoryModules([await equityTransferLimitsModule.getAddress()]);

  Reporter.reportContracts(
    ["EquityToken", await equityToken.getAddress()],
    ["TransferLimitsModule", await equityTransferLimitsModule.getAddress()],
    ["RarimoSBT", await equityRarimoModule.getAddress()],
    ["RarimoModule", await equityRarimoModule.getAddress()],
  );
};
