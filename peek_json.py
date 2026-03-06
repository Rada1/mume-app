import json

def peek_json():
    with open('public/mume_map_data.json', 'r') as f:
        data = json.load(f)
    
    # Peek at first 5 rooms
    keys = list(data.keys())[:5]
    for k in keys:
        print(f"Room {k}: {data[k]}")

if __name__ == "__main__":
    peek_json()
