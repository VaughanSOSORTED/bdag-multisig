// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.24;

// Import the pinned Safe contracts so Hardhat creates local artifacts.
// No Safe source code is modified.

import "@safe-global/safe-smart-account/contracts/SafeL2.sol";
import "@safe-global/safe-smart-account/contracts/proxies/SafeProxyFactory.sol";
import "@safe-global/safe-smart-account/contracts/libraries/MultiSend.sol";
import "@safe-global/safe-smart-account/contracts/libraries/MultiSendCallOnly.sol";
import "@safe-global/safe-smart-account/contracts/handler/CompatibilityFallbackHandler.sol";
