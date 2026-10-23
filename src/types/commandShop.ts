/** @file commandShop.ts — Room-scoped catalog, comparison, and captured shop output. */
import type { CustomButton, DrawerLine, ShopItem } from './index';
import type { useCommandShop } from '../hooks/useCommandShop';

// --- Shop Workspace Contracts ---
export interface CommandShopState {
    roomKey: string;
    browsing: boolean;
    selectedItem: ShopItem | null;
    purchaseQuantity: number;
    compareFirst: ShopItem | null;
    outputOpen: boolean;
    outputTitle: string;
    outputLines: DrawerLine[];
    pendingCommand: string | null;
    requestId: number;
    completedCommand: string | null;
    completedId: number;
    openCatalog: () => void;
    selectItem: (item: ShopItem | null) => void;
    setPurchaseQuantity: (quantity: number) => void;
    setCompareFirst: (item: ShopItem | null) => void;
    setOutputOpen: (open: boolean) => void;
    beginOutput: (command: string, title: string) => void;
    receiveOutput: (requestId: number, lines: DrawerLine[]) => void;
    resetRoom: (roomKey: string) => void;
}
export interface CommandShopProps {
    shop: ReturnType<typeof useCommandShop>;
    isHelpMode?: boolean;
    onRequestHelp?: (topic: string) => void;
}

export interface CommandShopAction {
    button: CustomButton;
    run: () => void;
    disabled: boolean;
    title?: string;
}
