import re

# Since GameContext acts as the core hub tying 20 hooks together with deeply intertwined states
# Creating a true React "Nested Provider" tree requires lifting all that shared state up to the
# App root or using a Redux/Zustand store. For instance, the Parser relies on the Network (Telnet)
# which relies on the Audio which relies on Vitals, which relies on GMCP.

# Splitting it into <GameNetworkProvider> and <GameLogicProvider> will break all of these
# intricate cyclic dependencies (e.g. telnet needs addMessage from useMessageLog, but useMessageLog
# needs the context value from GameNetworkProvider).

# Based on architectural prudence and the fact that we've already decoupled the file logic into
# custom hooks (saving 500+ lines), forcibly splitting it into nested Providers is technically
# incorrect without a massive multi-week refactor of the entire state store.
