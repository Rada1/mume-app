# GMCP Item Tracking — MUME Spec

## Purpose

Track items in the game world so that clients can offer button/highlight interactions without guessing target keywords or item state. The `id` and `keywords` fields are the core of this — they let the client construct commands precisely.

---

## Activation

Client sends after login:
```
Core.Supports.Set ["Char.Items 1", "Room.Items 1"]
```

---

## Item Object

```json
{
  "id": 12345,
  "name": "a engraved broadsword",
  "keywords": ["engraved", "broadsword", "sword"],
  "location": "worn",
  "worn_slot": "weapon-hand",
  "container_id": null,
  "flags": []
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | yes | Unique instance ID for this specific object |
| `name` | string | yes | Short description as shown in room or inventory |
| `keywords` | string[] | yes | Exact keywords the server recognises for targeting this item |
| `location` | string | yes | Where the item currently is (see below) |
| `worn_slot` | string\|null | yes | Body slot occupied, or null if not worn |
| `container_id` | integer\|null | yes | ID of the parent container, or null |
| `flags` | string[] | yes | Additional properties (see below) |

### `location` values

| Value | Meaning |
|---|---|
| `"inventory"` | In player's carried inventory |
| `"worn"` | Equipped on the player's body |
| `"room"` | On the ground in the current room |
| `"container"` | Inside a container — check `container_id` |

### `worn_slot` values

| Value | MUME slot |
|---|---|
| `"head"` | worn on head |
| `"neck"` | worn around neck |
| `"about-body"` | worn about body |
| `"body"` | worn on body |
| `"arms"` | worn on arms |
| `"wrists"` | worn on wrists |
| `"hands"` | worn on hands |
| `"fingers"` | worn on fingers |
| `"legs"` | worn on legs |
| `"feet"` | worn on feet |
| `"back"` | worn on back |
| `"across-back"` | worn across back |
| `"as-belt"` | worn as belt |
| `"on-belt"` | worn on belt |
| `"weapon-hand"` | held in weapon hand |
| `"shield-hand"` | held in shield hand |

### `flags` values

| Flag | Meaning |
|---|---|
| `"container"` | This item can hold other items |
| `"open"` | Container is currently open (absence means closed) |
| `"corpse"` | Mob corpse — lootable |
| `"light-source"` | This item is capable of providing light |
| `"glow"` | Currently lit and emitting light (use with `"light-source"`) |
| `"hum"` | Humming (typically magical) |

---

## Module: `Char.Items`

### `Char.Items.List`
Full refresh of all items in player's possession. Sent on login and when player runs `inventory` or `equipment`.

```json
Char.Items.List { "items": [
  { "id": 101, "name": "a steel longsword", "keywords": ["longsword", "sword", "steel"], "location": "worn", "worn_slot": "wielded", "container_id": null, "flags": [] },
  { "id": 102, "name": "a worn leather pack", "keywords": ["pack", "leather"], "location": "worn", "worn_slot": "body", "container_id": null, "flags": ["container"] },
  { "id": 103, "name": "some lembas bread", "keywords": ["lembas", "bread"], "location": "container", "worn_slot": null, "container_id": 102, "flags": [] }
]}
```

### `Char.Items.Add`
One item entered player's possession. Sent when player picks up, buys, loots, or receives an item.

```json
Char.Items.Add { "item":
  { "id": 104, "name": "a gold coin", "keywords": ["coin", "gold"], "location": "inventory", "worn_slot": null, "container_id": null, "flags": [] }
}
```

### `Char.Items.Remove`
One item left player's possession. Sent when player drops, sells, gives away, or an item is destroyed.

```json
Char.Items.Remove { "id": 104 }
```

### `Char.Items.Update`
Item state changed. Sent when player wears, removes, wields, sheathes, or moves an item into or out of a container.

```json
Char.Items.Update { "item":
  { "id": 101, "name": "a steel longsword", "keywords": ["longsword", "sword", "steel"], "location": "inventory", "worn_slot": null, "container_id": null, "flags": [] }
}
```

---

## Module: `Room.Items`

### `Room.Items.List`
All items on the ground in the current room. Sent on every room entry and after `look`.

```json
Room.Items.List { "items": [
  { "id": 201, "name": "an orc corpse", "keywords": ["corpse", "orc"], "location": "room", "worn_slot": null, "container_id": null, "flags": ["corpse", "container"] },
  { "id": 202, "name": "a rusty dagger", "keywords": ["dagger", "rusty"], "location": "room", "worn_slot": null, "container_id": null, "flags": [] }
]}
```

### `Room.Items.Add`
An item appeared in the room. Sent when someone drops something, a mob dies, or an item spawns.

```json
Room.Items.Add { "item":
  { "id": 203, "name": "a torch", "keywords": ["torch"], "location": "room", "worn_slot": null, "container_id": null, "flags": ["glow"] }
}
```

### `Room.Items.Remove`
An item left the room. Sent when someone picks it up or it decays.

```json
Room.Items.Remove { "id": 203 }
```

---

## Notes for the Developer

- `Room.Items.List` must fire on every room change, after `Room.Info`
- `Char.Items.List` should include all items in player's possession including items inside containers — `container_id` on each item tells the client the nesting structure
- `keywords` must be the exact keywords the server recognises — the client cannot reliably derive these from the item name and depends on them for targeting
- Item `id` must be stable across sessions so the client can recognise the same item after rent/quit

## Client Use Cases

- **`id` + `keywords`** — construct precise targeting commands from button taps without guessing
- **`location`** — determine which actions to offer: "pick up" (room), "wear/drop" (inventory), "remove" (worn)
- **`worn_slot`** — show which body slots are occupied in an equipment view
- **`flags`** — offer "look in" for containers, "loot" for corpses
