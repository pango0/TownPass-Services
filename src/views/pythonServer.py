from flask import Flask, request, jsonify
import faiss
import numpy as np
import torch
from transformers import BertTokenizer, BertModel
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# 設置環境變量，避免 OpenMP 衝突
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

# 使用bert把input text向量化
def init_bert():
    tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
    model = BertModel.from_pretrained('bert-base-uncased')
    return tokenizer, model

# 將文本轉換為向量
def text_to_vector(text, tokenizer, model, max_length=512):
    tokens = tokenizer(text, return_tensors='pt', truncation=False)['input_ids'][0]
    
    # 將 tokens 分割成多個子序列，每個子序列長度 <= 512
    sub_vectors = []
    for i in range(0, len(tokens), max_length):
        sub_tokens = tokens[i:i+max_length].unsqueeze(0)
        inputs = {'input_ids': sub_tokens}
        with torch.no_grad():
            outputs = model(**inputs)
        sub_vectors.append(outputs.last_hidden_state.mean(dim=1).squeeze().numpy())
    
    # 合併所有子序列的向量 (例如取平均)
    final_vector = np.mean(sub_vectors, axis=0)
    return final_vector
def searchInDB(index, query, tokenizer, model, k=5):
    query_vector = text_to_vector(query, tokenizer, model)
    query_vector = np.expand_dims(query_vector, axis=0).astype('float32')
    distances, indices = index.search(query_vector, k)
    return indices, distances

# main
# 加载 Faiss 索引
index = faiss.read_index('faiss_index.index')
# 加载原始向量数据
data_vectors = np.load('vectors.npy')

# 加载原始文本数据，指定 UTF-8 编码
with open('output_split.txt', 'r', encoding='utf-8') as file:
    original_texts = file.readlines()  # 去除每行末尾的换行符

# 初始化 BERT 模型和 tokenizer
tokenizer, model = init_bert()

@app.route('/search', methods=['POST'])
def search():
    try:
        data = request.json
        
        k = 5
        I, D = searchInDB(index, data['text'], tokenizer, model, k)
        
        # 调试信息
        print("Indices:", I)
        print("Original Texts Sample:", original_texts) 
        # 将对应的原始文本返回
        print("text")
        results = [original_texts[i] for i in I[0]]
        print(results)
        response = {
            'distances': D.tolist(),
            'indices': I.tolist(),
            'results': results
        }
        return jsonify(response)
    except Exception as e:
        import traceback
        tb_str = traceback.format_exception(etype=type(e), value=e, tb=e.__traceback__)
        error_message = ''.join(tb_str)
        print("Error:", error_message)
        return jsonify({'error': error_message}), 500


if __name__ == '__main__':
    app.run(port=1111)
