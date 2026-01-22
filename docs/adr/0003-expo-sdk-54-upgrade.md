# 0003 - Expo SDK 54 Upgrade

## Status
Accepted

## Context
The mobile client runs on Expo Go for on-device LangChain orchestration. Expo Go on iOS only supports the latest SDK, and attempting to run SDK 50 results in the error that older Expo Go versions cannot be installed on devices.

## Decision
Upgrade the Expo mobile project to SDK 54 and align dependencies (expo, expo-image-picker, react, and react-native) with the supported Expo Go version.

## Consequences
- Developers must install updated Expo dependencies before running the mobile app.
- iOS devices require Expo Go compatible with SDK 54; older SDKs must use the simulator.