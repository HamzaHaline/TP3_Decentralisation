from flask import Flask, request, render_template, jsonify
import pandas as pd
import joblib  # Used for importing models
import numpy as np  # For numerical operations
import json

app = Flask(__name__)

# Load all the models
model_files = {
    'linear_regressor': 'linear_regressor_model.pkl',
    'svm': 'best_svm_model.pkl',
    'random_forest': 'Random_forest.pkl',
}

models = {}

# Load models using joblib
for name, file in model_files.items():
    with open(file, 'rb') as model_file:
        models[name] = joblib.load(model_file)

# Load models meta data
def load_models_meta():
    with open('models_meta.json', 'r') as f:
        return json.load(f)

# Save models meta data
def save_models_meta(models_meta):
    with open('models_meta.json', 'w') as f:
        json.dump(models_meta, f, indent=4)


# Prediction route
@app.route('/predict', methods=['GET', 'POST'])
def predict():
    if request.method == 'POST':
        try:
            # Get the CSV file and actual values from the request
            uploaded_file = request.files['file']
            actual_values_text = request.form['actual_values']
            # Split the text input into a list of floats
            actual_values = [float(x) for x in actual_values_text.split(',')]

            # Read the CSV file into a Pandas DataFrame
            df = pd.read_csv(uploaded_file)

            # Predict using each model and store the results
            predictions = {}
            models_meta = load_models_meta()
            errors = {}  # Dictionary to hold the errors for each model
            for name, model in models.items():
                model_predictions = model.predict(df).tolist()
                predictions[name + '_predictions'] = model_predictions
                # Calculate and update error for each prediction
                model_errors = []  # List to hold the errors for this model
                for idx, pred in enumerate(model_predictions):
                    error = actual_values[idx] - pred
                    model_errors.append(error)  # Add error to the list
                    models_meta[name]['history'].append(pred)
                    # Update weight
                    models_meta[name]['weight'] *= (1 - abs(error) / actual_values[idx])
                    # Update deposit based on error
                    models_meta[name]['deposit'] -= error  # Update deposit
                errors[name + '_errors'] = model_errors  # Add the list of errors to the errors dictionary
            
            save_models_meta(models_meta)

            # Calculate the average prediction from all models
            prediction_arrays = [np.array(pred) for pred in predictions.values()]
            average_predictions = np.mean(prediction_arrays, axis=0).tolist()

            # Prepare the response data including predictions, errors, and actual values
            response_data = {
                'predictions': predictions,
                'errors': errors,
                'average_predictions': average_predictions,
                'actual_values': actual_values  # Include the actual values in the response
            }

            # Return the response data in JSON format
            return jsonify(response_data)
        except Exception as e:
            # Return an error response if an exception occurs
            return jsonify({'error': str(e)}), 400
    else:
        # If it's a GET request, return an HTML page with a file upload form
        return render_template('upload_form.html')


@app.route('/', methods=['GET'])
def helloworld():
    return "Hello world"

# Run the Flask application
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
