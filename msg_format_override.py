import glob
import re

def extract_intent(text):
    text = text.replace("Hello ARTI ENTERPRISES! 👋\n\n", "")
    text = text.replace("Hello ARTI ENTERPRISES, ", "")
    text = text.replace("Hello ARTI ENTERPRISES,", "")
    text = text.replace("Hello ARTI ENTERPRISES", "")
    
    if "My Requirements:" in text:
        intent = text.split("My Requirements:")[0].strip()
    else:
        intent = text.strip()
        
    if not intent:
        intent = "bulk Corrugated Boxes"
    return intent

def generate_v2_template(intent):
    if "Here are my project details:" in intent:
        intent = intent.split("Here are my project details:")[0].strip()
    if not intent or intent == "bulk Corrugated Boxes" or intent == "I need a quote for Corrugated Boxes.":
        intent = "I would like to request a manufacturing quote for corrugated boxes."
        
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

def update_data_attr(match):
    original_text = match.group(1)
    
    if "Requirements" in original_text or "📦" in original_text:
        return match.group(0)
        
    intent = extract_intent(original_text)
    new_text = generate_v2_template(intent)
    
    return f'data-whatsapp-text="{new_text}"'

for file in glob.glob('*.html'):
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
        
    new_content = re.sub(r'data-whatsapp-text="([^"]+)"', update_data_attr, content)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(new_content)

print("Data attributes updated!")
