"""
GenChatVerifier Contract Deployment Script
Deploys contract/GenChatVerifier.py to GenLayer StudioNet.
"""

import os
import sys

def main():
    contract_path = os.path.join(os.path.dirname(__file__), "GenChatVerifier.py")
    if not os.path.exists(contract_path):
        print(f"Contract file not found at: {contract_path}", file=sys.stderr)
        sys.exit(1)

    print("Deploying GenChatVerifier to GenLayer StudioNet...")
    print(f"Contract: {contract_path}")
    print("Network: StudioNet (Gasless - Chain ID 61999)")
    print("\nTo deploy via GenLayer CLI, run:")
    print("  genlayer network set studionet")
    print(f"  genlayer deploy --contract {contract_path}")

if __name__ == "__main__":
    main()
