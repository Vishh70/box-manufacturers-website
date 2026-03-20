import glob
import urllib.parse
import re

def extract_intent(text):
    text = text.replace("Hello ARTI ENTERPRISES! 👋\n\n", "")
    text = text.replace("Hello ARTI ENTERPRISES, ", "")
    text = text.replace("Hello ARTI ENTERPRISES,", "")
    text = text.replace("Hello ARTI ENTERPRISES", "")
    
    # Extract the first sentence or intent before any requirements block
    if "My Requirements:" in text:
        intent = text.split("My Requirements:")[0].strip()
    else:
        intent = text.strip()
        
    if not intent:
        intent = "bulk Corrugated Boxes"
    return intent

def generate_v2_template(intent):
    template = f"""Hello ARTI ENTERPRISES! 👋

{intent} Here are my project details:

📦 BOX SPECIFICATIONS
- Dimensions (L x W x H): 
- Paper Quality (GSM/Strength): 
- Order Quantity: 

🎨 PRINTING & BRANDING
- Custom Printing?: [Yes/No]

🏢 COMPANY DETAILS
- Company Name: 
- Delivery Pincode / City: 
- Industry / Product Type: 

Please review these requirements and share your best pricing. Thank you!"""
    return template

def update_wa_link(match):
    full_url = match.group(0)
    
    # Extract the 'text=' parameter safely
    text_param_match = re.search(r'text=([^&"]+)', full_url)
    if not text_param_match:
        return full_url
        
    original_encoded = text_param_match.group(1)
    original_text = urllib.parse.unquote(original_encoded)
    
    # Parse intent and upgrade to V2
    intent = extract_intent(original_text)
    
    # If the intent already contains "Here are my project details", we don't want to double it up
    if "Here are my project details:" in intent:
        intent = intent.split("Here are my project details:")[0].strip()
        
    # If intent gets weirdly stripped to empty, fallback to default
    if not intent or intent == "bulk Corrugated Boxes" or intent == "I need a quote for Corrugated Boxes.":
        intent = "I would like to request a manufacturing quote for corrugated boxes."
        
    new_text = generate_v2_template(intent)
    new_encoded = urllib.parse.quote(new_text)
    
    # Rebuild URL
    return full_url.replace(text_param_match.group(0), f"text={new_encoded}")

for file in glob.glob('*.html'):
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
        
    new_content = re.sub(r'https://wa\.me/919420996107\?text=[^"]+', update_wa_link, content)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(new_content)

print("Template V2 successfully applied globally!")
