from flask import Flask, request,jsonify
from flask_cors import CORS
from sqlalchemy import create_engine,column,Integer,String,Float,Boolean,Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import pyodbc
from datetime import datetime, timedelta, timezone
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from flask import request, jsonify
from werkzeug.security import check_password_hash
import base64
import uuid

app = Flask(__name__)
CORS(app,supports_credentials=True)   

# server = '10.10.100.26'
# database = 'InvoiceBook'
# username = 'sa'
# password = 'tstc123'
# driver = 'ODBC Driver 17 for SQL Server'
server = '10.10.100.26'
database = 'InvoiceBookStaging'
username = 'Invoicer'
password = 'Inv@321++'
driver = 'ODBC Driver 17 for SQL Server'


def get_db_connection():
    connection_string = f'DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password}'
    return pyodbc.connect(connection_string)

SECRET_KEY = 'Cyber+Code'



# Your route and function
import uuid  # To generate unique token identifiers

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    conn = None
    cursor = None
    try:
        # Connect to the database
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if the user exists
        cursor.execute("SELECT user_id, username, password, role, isActive,DID FROM Users WHERE username = ?", (username,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "Invalid username or password"}), 401

        # Verify the password
        stored_password_hash = user[2]
        if not check_password_hash(stored_password_hash, password):
            return jsonify({"error": "Invalid username or password"}), 401

        # Check if the account is active
        is_active = user[4]
        if not is_active:
            return jsonify({"error": "Account is inactive. Please contact support."}), 403

        # Login successful
        user_info = {
            "user_id": user[0],
            "username": user[1],
            "role": user[3],
            "DID": user[5]
        }

        # Generate a unique token for the user
        token = jwt.encode({
            'user_id': user[0],
            'username': user[1],
            'role': user[3],
            'exp': datetime.now(timezone.utc) + timedelta(hours=3),  # Expires in 1 hour
            'iat': datetime.now(timezone.utc),  # Issued at
            'jti': str(uuid.uuid4()),  # Unique identifier for the token
        }, SECRET_KEY, algorithm='HS256')

        return jsonify({"message": "Login successful", "user": user_info, "token": token}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()



@app.route('/api/suppliers', methods=['GET'])
def get_suppliers():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT ID, Company,Name,Address, ContactNo, Email FROM Supplier")
        rows = cursor.fetchall()
        suppliers = [{"id": row[0], "company": row[1], "name":row[2], "address":row[3],"contactNo":row[4],"email":row[5]} for row in rows]
        return jsonify(suppliers)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()

        
@app.route('/api/suppliers', methods=['POST'])
def insert_supplier():
    try:
        # Get data from the request
        data = request.get_json()
        supplier_code = data.get('SupplierCode')
        name = data.get('Name')
        address = data.get('Address')
        contact_no = data.get('ContactNo')
        email = data.get('Email')
        tax_id = data.get('Tax_ID')
        company = data.get('Company')
        is_active = data.get('IsActive', True)
        type_ = data.get('Type')
        created_user = data.get('Created_user')
        created_date = data.get('Created_Date')
        modified_user = data.get('Modified_user', None)
        modified_date = data.get('Modified_Date')


       

        conn = get_db_connection()
        cursor = conn.cursor()

        # Insert query
        insert_query = """
        INSERT INTO Supplier (SupplierCode, Name, Address, ContactNo, Email, Tax_ID, Company, IsActive, Type, Created_user, Created_Date, Modified_user, Modified_Date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """

        # Execute the query
        cursor.execute(insert_query, (supplier_code, name, address, contact_no, email, tax_id, company, is_active, type_, created_user, created_date, modified_user, modified_date))
        conn.commit()

        # Close connection
        cursor.close()
        conn.close()

        # Return a success response
        return jsonify({"message": "Supplier inserted successfully!"}), 201

    except Exception as e:
        # If an error occurs, return an error message
        return jsonify({"error": str(e)}), 500        
        
# @app.route('/api/users', methods=['GET'])
# def get_users():
#     try:
#         conn = get_db_connection()
#         cursor = conn.cursor()
#         cursor.execute("SELECT user_id, username,role FROM Users WHERE isActive ='1'")
#         rows = cursor.fetchall()
#         users = [{"id":row[0],"name":row[1]} for row in rows]
#         return jsonify(users)
#     except Exception as e:
#         return jsonify({"error":str(e)}), 500
#     finally:
#        cursor.close()
#        conn.close()


@app.route('/api/receivers', methods=['GET'])
def get_recievers():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT user_id, username,role FROM Users WHERE isActive ='1' AND role='Receiver'")
        rows = cursor.fetchall()
        users = [{"id":row[0],"name":row[1]} for row in rows]
        return jsonify(users)
    except Exception as e:
        return jsonify({"error":str(e)}), 500
    finally:
        cursor.close()
        conn.close()
        
@app.route('/api/getUsers', methods=['GET'])
def get_users():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT user_id, username,email,role,authKey FROM Users")
        rows = cursor.fetchall()
        users = [{"id":row[0],"name":row[1],"email":row[2],"role":row[3],"authKey":row[4]} for row in rows]
        return jsonify(users)
    except Exception as e:
        return jsonify({"error":str(e)}), 500
    finally:
        cursor.close()
        conn.close()
        
@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()
    conn = None
    cursor = None
    try:
        # Extract user data from the request body
        user_id = data.get('user_id')
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        created_at = data.get('created_at', datetime.now().isoformat())
        last_login = data.get('last_login')
        isActive = data.get('isActive', False)
        role = data.get('role', 'User')  # Default role if not provided
        authKey = data.get('authKey')
        DID = data.get('DID')

        # Validate required fields
        if not username or not email or not password:
            return jsonify({"error": "Username, email, and password are required"}), 400

        # Hash the password before storing it
        password_hash = generate_password_hash(password)

        # Establish a database connection
        conn = get_db_connection()
        cursor = conn.cursor()

        # Insert user data into the Users table
        cursor.execute("""
            INSERT INTO Users (user_id, username, email, password, created_at, last_login, isActive, role, authKey, DID)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, username, email, password_hash, created_at, last_login, isActive, role, authKey, DID))

        # Commit the transaction
        conn.commit()

        # Return a success response
        return jsonify({"message": "User created successfully"}), 201

    except Exception as e:
        # Rollback in case of error
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        # Close the database connection
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            
@app.route('/api/users/<user_id>/reset-password', methods=['PATCH'])
def reset_password(user_id):
    data = request.get_json()
    new_password = data.get('password')  # The new password to be set
    if not new_password:
        return jsonify({"error": "New password is required"}), 400

    password_hash = generate_password_hash(new_password)

  
    try:
        # Establish a database connection
        conn = get_db_connection()
        cursor = conn.cursor()

        password_hash = generate_password_hash(new_password)

        # Update the user's password in the database
        cursor.execute("UPDATE Users SET password = ? WHERE user_id = ?", (password_hash, user_id))
        conn.commit()

        # Return success response
        return jsonify({"message": "Password reset successfully"}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Auth Key Reset Route
@app.route('/api/users/<user_id>/reset-auth-code', methods=['PATCH'])
def reset_auth_code(user_id):
    data = request.get_json()
    new_auth_key = data.get('authCode')  # The new auth key to be set
    if not new_auth_key:
        return jsonify({"error": "New auth key is required"}), 400

    
    try:
        # Establish a database connection
        conn = get_db_connection()
        cursor = conn.cursor()

        # Update the user's authKey in the database
        cursor.execute("""
            UPDATE Users
            SET authKey = ?
            WHERE user_id = ?
        """, (new_auth_key, user_id))

        # Commit the transaction
        conn.commit()

        # Return success response
        return jsonify({"message": "Auth key reset successfully"}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/invoices', methods=['POST'])
def insert_invoice():
    conn = None
    cursor = None
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"error": "Authorization header is missing"}), 401

        # Split the header to get the token
        try:
            token = auth_header.split(" ")[1]
        except IndexError:
            return jsonify({"error": "Invalid token format"}), 401

        # Decode the token to extract user information
        decoded_token = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        created_user = decoded_token['username']  # Username from token for created_user field

        # Get data from the request
        data = request.get_json()

        # Extract necessary fields
        invoice_no = data.get('invoiceNo')
        docNo = data.get('docNo')
        supplier_id = data.get('supplierId')
        date = datetime.now()  
        grn = data.get('GRN', None) 
        remarks = data.get('remarks')
        amount = data.get('amount')
        currency = data.get('currency')
        payment_terms = data.get('paymentTerms')
        handover_date = data.get('handoverDate')
        handover_to = data.get('handoverTo')
        
        is_advance_payment = data.get('isAdvancePayment', False)
        is_complete = data.get('isComplete', False)
        payment_type = data.get('paymentType', None)  
        image_binary = data.get('imageBinary', None)  
        DID = data.get('DID', None)
        invoiceDate = data.get('invoiceDate', None)
        
        status = 1 if is_complete else 0  # Set status based on is_complete
        
        if image_binary:
            # Decode base64 to binary
            image_binary = base64.b64decode(image_binary)

        # Check required fields
        if not all([invoice_no, docNo, supplier_id, amount, currency, handover_date, created_user]):
            return jsonify({"error": "Missing required fields"}), 400

        # Database connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
         # Check for duplicate invoiceNo
        duplicate_check_query = "SELECT COUNT(*) FROM invDocs WHERE invoiceNo = ?"
        cursor.execute(duplicate_check_query, (invoice_no,))
        duplicate_count = cursor.fetchone()[0]

        if duplicate_count > 0:
            return jsonify({"error": "Invoice number already exists"}), 409

        # Insert query without user_id
        insert_query = """
        INSERT INTO invDocs (invoiceNo, docNo, supplier_id, date, GRN, Remark, Amount, currency, payment_terms,
                              handover_date, handover_to, created_user, created_at, isAdvance_payment,
                              isComplete, status, payment_type, upload_img, DID, invoiceDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """

        # Execute the query
        cursor.execute(insert_query, (
            invoice_no, docNo, supplier_id, date, grn, remarks, amount, currency, payment_terms,
            handover_date, handover_to, created_user, datetime.now(), 
            is_advance_payment, is_complete, status, payment_type, image_binary, DID, invoiceDate
        ))
        
        conn.commit()

        # Return a success response
        return jsonify({"message": "Invoice inserted successfully!"}), 201

    except Exception as e:
        # If an error occurs, return an error message
        if conn:
            conn.rollback()  # Rollback in case of error
        return jsonify({"error": str(e)}), 500
        
    finally:
        # Ensure the database connection is closed
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/invoices/last-doc-no', methods=['GET'])
def get_last_doc_no():
    conn = None
    cursor = None
    try:
        # Connect to database
        conn = get_db_connection()
        cursor = conn.cursor()

        # Fetch the latest docNo
        cursor.execute("SELECT TOP 1 docNo FROM invDocs ORDER BY id DESC")
        row = cursor.fetchone()

        if row:
            last_doc_no = row[0]
        else:
            # Default for the first docNo
            last_doc_no = "DOC-00000000-0000"

        # Extract the date and numeric part
        parts = last_doc_no.split("-")
        current_date = datetime.now().strftime("%Y%m%d")  # Current date in YYYYMMDD format
        
        # Check if the date is the same as today's date
        if parts[1] == current_date:
            numeric_part = int(parts[-1]) + 1  # Increment the numeric part
        else:
            numeric_part = 1  # Reset counter if date has changed
        
        # Create the new docNo
        new_doc_no = f"{parts[0]}-{current_date}-{str(numeric_part).zfill(4)}"

        return jsonify({"newDocNo": new_doc_no}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

            
            
@app.route('/api/invoices', methods=['GET'])
def get_invoices():
    conn = None
    cursor = None
    try:
        # Get query parameters
        supplier_id = request.args.get('supplier_id')
        invoice_no = request.args.get('invoice_no')
        handover_date = request.args.get('handover_date')

        # Build base query
        query = "SELECT * FROM invDocs WHERE 1=1"
        params = []

        # Apply filters if provided
        if supplier_id:
            query += " AND supplier_id = ?"
            params.append(supplier_id)
        if invoice_no:
            query += " AND invoiceNo = ?"
            params.append(invoice_no)
        if handover_date:
            query += " AND CONVERT(DATE, handover_date) = CONVERT(DATE, ?)"
            params.append(handover_date)

        # Execute the query
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()

        # Format response
        invoices = [{
            "id": row[0],
            "supplier_id": row[1],
            "invoice_no": row[2],
            "grn_number": row[3],
            "amount": row[4],
            "currency": row[5],
            "payment_terms": row[6],
            "handover_date": str(row[7]),
            "handover_to_id": row[8],
            "created_by": row[9],
            "is_advance_payment": row[10],
            "is_complete": row[11],
            "remarks": row[12]
        } for row in rows]
        return jsonify(invoices), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Endpoint to update an invoice by ID
@app.route('/api/invoices/<int:invoice_id>', methods=['PUT'])
def update_invoice(invoice_id):
    conn = None
    cursor = None
    try:
        # Get JSON payload
        data = request.get_json()

        # Extract fields
        invoice_no = data.get('invoiceNo')
        docNo = data.get('docNo')
        supplier_id = data.get('supplierId')
        grn = data.get('GRN')
        remarks = data.get('remarks')
        amount = data.get('amount')
        currency = data.get('currency')
        payment_terms = data.get('paymentTerms')
        handover_date = data.get('handoverDate')
        handover_to = data.get('handoverTo')
        is_advance_payment = data.get('isAdvancePayment', False)
        is_complete = data.get('isComplete', False)
        payment_type = data.get('paymentType', None)
        image_binary = data.get('imageBinary', None)
        
        # Convert image if provided
        if image_binary:
            image_binary = base64.b64decode(image_binary)

        # Check required fields
        if not all([invoice_no, supplier_id, amount, currency, handover_date]):
            return jsonify({"error": "Missing required fields"}), 400

        # Database connection
        conn = get_db_connection()
        cursor = conn.cursor()

        # Update query
        update_query = """
        UPDATE invDocs SET
            invoiceNo = ?, docNo = ?, supplier_id = ?, GRN = ?, Remark = ?, Amount = ?, currency = ?, payment_terms = ?,
            handover_date = ?, handover_to = ?, isAdvance_payment = ?, isComplete = ?, payment_type = ?, upload_img = ?
        WHERE id = ?
        """
        params = (
            invoice_no, docNo, supplier_id, grn, remarks, amount, currency, payment_terms,
            handover_date, handover_to, is_advance_payment, is_complete, payment_type, image_binary, invoice_id
        )

        cursor.execute(update_query, params)
        conn.commit()

        # Return success response
        return jsonify({"message": "Invoice updated successfully!"}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

        
@app.route('/api/suppliers/last_code', methods=['GET'])
def get_last_supplier_code():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Query to get the last supplier code (assuming SupplierCode is a VARCHAR type)
        cursor.execute("SELECT TOP 1 SupplierCode FROM Supplier ORDER BY SupplierCode DESC")
        last_code = cursor.fetchone()

        if last_code:
            return jsonify({"last_code": last_code[0]}), 200
        else:
            return jsonify({"last_code": None}), 200  # No suppliers found

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/getFilteredInvoices', methods=['POST'])
def get_filtered_invoices():
    # Extract JSON request data
    data = request.get_json()
    form_id = data.get("formId")
    supplier = data.get("supplier")
    invoice_no = data.get("invoiceNo")
    grn_number = data.get("grnNumber")
    handover_date = data.get("handoverDate")
    
    print("Received parameters:", data)

    conn = None
    cursor = None
    try:
        # Open connection and cursor
        conn = get_db_connection()
        cursor = conn.cursor()

        # Call the stored procedure with the parameters
        cursor.execute("""
            EXEC sp_ManageInvoices @FormID=?, @SupplierID=?, @InvoiceNo=?, @GRNNumber=?, @HandoverDate=?
        """, form_id, supplier, invoice_no, grn_number, handover_date)

        # Fetch all rows
        rows = cursor.fetchall()
        print("Fetched rows:", rows)

        # Define column names (Ensure order matches your query output!)
        columns = [
            "id", "date","invoiceNo", "docNo",  "Company", "Amount",  "payment_terms","handover_date", "handover_to", "GRN", "Remark",  "created_user","isAdvance_payment", "isComplete","upload_img", "status","approval_date","approver_id","payment_type", "created_at", "currency", "modified_at", "modified_by"
        ]

        # Function to handle Base64 encoding of binary data
        def encode_binary_data(value):
            if isinstance(value, bytes):
                try:
                    # Convert bytes to Base64 string
                    return base64.b64encode(value).decode('utf-8')
                except Exception as e:
                    print(f"Error encoding binary data to Base64: {e}")
                    return None
            return value
        
        # Format result into a list of dictionaries
        invoices = []
        for row in rows:
            invoice = {}
            for index, column in enumerate(columns):
                value = row[index]

                # If the column contains binary data (bytes), encode to Base64
                if isinstance(value, bytes):
                    value = encode_binary_data(value)

                # If the column is 'upload_img', encode bytes to Base64 string
                if column == "upload_img" and value is not None:
                    value = encode_binary_data(value)

                # Handle datetime fields
                elif isinstance(value, datetime):
                    value = value.strftime('%Y-%m-%d')

                # Add to dictionary
                invoice[column] = value
            
            invoices.append(invoice)

        # Return the JSON response
        return jsonify(invoices)

    except Exception as e:
        print("Error executing stored procedure:", str(e)) 
        return jsonify({"error": str(e)}), 500
    finally:
        # Clean up resources
        if cursor:
            cursor.close()
        if conn:
            conn.close()

from flask import jsonify
import json  # Import json module

@app.route('/api/approval-docs', methods=['GET'])
def get_approval_documents():
    """
    Fetch approval documents for the logged-in user based on FormID=3 by calling the stored procedure.
    Role check is used for authorization.
    """
    cursor = None  # Initialize cursor to ensure it's defined in the finally block
    conn = None  # Initialize conn to ensure it's defined in the finally block
    try:
        # Extract the user role from the JWT token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"error": "Authorization header is missing"}), 401

        try:
            token = auth_header.split(" ")[1]
            decoded_token = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            exp = decoded_token.get('exp')
            if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
                return jsonify({"error": "Token has expired"}), 401
            user_role = decoded_token.get('role')  # Extract role from token
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except Exception as e:
            return jsonify({"error": f"Invalid token: {str(e)}"}), 401

        if not user_role:
            return jsonify({"error": "User role not found in the token"}), 400

        # Check if the user has the correct role
        if user_role not in ['Administrator', 'Receiver']:  # Add more roles if needed
            return jsonify({"error": "Unauthorized access"}), 403

        form_id = request.args.get('FormID', type=int)
        if not form_id:
            return jsonify({"Error": "FormID is required"}), 400
        
        # Connect to the database
        conn = get_db_connection()
        cursor = conn.cursor()

        # Call the stored procedure sp_ManageInvoices with FormID=3
        cursor.execute("""
            EXEC sp_ManageInvoices @FormID=?
        """, (form_id,))

        # Fetch the result set
        result = cursor.fetchall()

        # Format the result into a list of dictionaries
        documents = [{
            "id": row[0],
            "invoice_no": row[1],
            "company": row[2],
            "date": str(row[3]) if row[3] is not None else None,
            "remark": row[4],
            "amount": row[5],
            "status": row[6],
            "is_advance_payment": row[7],
            "created_user": row[8],
            "handover_date": str(row[9]) if row[9] is not None else None,
            "receiver": row[10],
            "currency": row[11]
        } for row in result]

        # Use json.dumps to return the response without sorting the keys alphabetically
        return app.response_class(
            response=json.dumps(documents, indent=4, sort_keys=False),
            status=200,
            mimetype='application/json'
        )

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

    finally:
        # Ensure proper cleanup of resources
        if cursor:
            cursor.close()
        if conn:
            conn.close()



@app.route('/api/updateStatus', methods=['POST'])
def update_status():
    """
    Updates the status of a document after validating the user's PIN and status transition.
    """
    try:
        data = request.get_json()
        document_id = data.get('id')
        pin = data.get('pin')

        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"success": False, "message": "Authorization header is missing"}), 401
        
        try:
            token = auth_header.split(" ")[1]
            decoded_token = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            user_id = decoded_token.get('user_id')
        except Exception as e:
            return jsonify({"success": False, "message": f"Invalid token: {str(e)}"}), 401

        if not document_id or not pin:
            return jsonify({"success": False, "message": "Document ID and PIN are required"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT authKey FROM Users WHERE user_id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        secret_key = user[0]
        if secret_key != pin:
            return jsonify({"success": False, "message": "Invalid PIN"}), 403

        # Check current document status
        cursor.execute("SELECT status FROM invDocs WHERE id = ?", (document_id,))
        doc = cursor.fetchone()
        if not doc:
            return jsonify({"success": False, "message": "Document not found"}), 404

        current_status = doc[0]
        new_status = "2" if current_status == "1" else ("3" if current_status == "2" else None)

        if not new_status:
            return jsonify({"success": False, "message": "Invalid status transition"}), 400

        approval_date = datetime.now()
        cursor.execute("""
            UPDATE invDocs 
            SET status = ?, approval_date = ?, approver_id = ?, modified_at = ?, modified_by = ?
            WHERE id = ? AND status = ?
        """, (new_status, approval_date, user_id, approval_date, user_id, document_id, current_status))
        conn.commit()

        return jsonify({"success": True, "message": "Document status updated successfully"}), 200

    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/getDocStatus', methods=['GET'])
def get_docstatus():
    invoice_no = request.args.get('invoiceNo')

    if not invoice_no:
        return jsonify({"error": "Invoice number is required"}), 400

    try:
        # Connect to the database
        conn = get_db_connection()
        cursor = conn.cursor()

        # Query to fetch tracking data
        query = """
        SELECT id.id, id.invoiceNo, id.docNo, s.Company, id.Remark, id.Amount, id.[status], id.isComplete
        FROM invDocs AS id
        INNER JOIN Supplier AS s
            ON s.ID = id.supplier_id
        WHERE (id.invoiceNo LIKE ? OR id.docNo LIKE ?)
        """
        cursor.execute(query, (f"%{invoice_no or ''}%", f"%{invoice_no or ''}%"))
        result = cursor.fetchone()

        # Close the database connection
        cursor.close()
        conn.close()

        if not result:
            return jsonify({"error": "Document not found"}), 404

        # Extracting data from the result
        doc_id, invoice_no, docNo,company,remark,amount, status, is_complete = result

        return jsonify({
            "id": doc_id,
            "invoiceNo": invoice_no,
            "docNo":docNo,
            "company":company,
            "remark": remark,
            "amount": amount,
            "status": status,
            "isComplete": bool(is_complete)
        })

    except Exception as e:
        return jsonify({"error": f"An error occurred: {e}"}), 500

@app.route('/api/getPendingDocCount', methods=['GET'])
def get_pendingDocCount():

    try:
        # Retrieve the formID from query parameters
        form_id = request.args.get("formId")
        if not form_id:
            return jsonify({"error": "Missing 'formId' in request"}), 400

        # Connect to the database
        conn = get_db_connection()
        cursor = conn.cursor()

        # Execute the stored procedure with formID as a parameter
        cursor.execute("EXEC sp_ManageInvoices @FormID = ?", (form_id,))
        results = cursor.fetchall()

        # Close the database connection
        cursor.close()
        conn.close()

        # If no results are returned
        if not results:
            return jsonify({"error": "No documents found for the given formID"}), 404

        # Parse results into a list of documents
        documents = [{"Value": result[0]} for result in results]

        return jsonify(documents)

    except Exception as e:
        return jsonify({"error": f"An error occurred: {e}"}), 500
    
@app.route('/api/getPendingCollections', methods=['GET'])
def get_pending_collections():
    try:
        # Retrieve the formID from query parameters
        form_id = request.args.get("formId")
        if not form_id:
            return jsonify({"error": "Missing 'formId' in request"}), 400

        # Connect to the database
        conn = get_db_connection()
        cursor = conn.cursor()

        # Execute the stored procedure with formID as a parameter
        cursor.execute("EXEC sp_ManageInvoices @FormID = ?", (form_id,))
        results = cursor.fetchall()

        # Close the database connection
        cursor.close()
        conn.close()

        # If no results are returned
        if not results:
            return jsonify({"error": "No documents found for the given formId"}), 404

        # Parse results into a list of documents
        documents = [
            {
                "id": row[0],
                "invoiceNo": row[1],
                "Company": row[2],
                "Date": row[3],
                "Remark": row[4],
                "Amount": row[5],
                "Status": row[6],
                "IsAdvancePayment": row[7],
                "CreatedUser": row[8],
                "HandoverDate": row[9],
                "Receiver": row[10],
                "Currency": row[11],
            }
            for row in results
        ]

        return jsonify(documents)

    except Exception as e:
        # Log the error for debugging
        app.logger.error(f"Error in get_pending_collections: {e}")
        return jsonify({"error": f"An error occurred: {e}"}), 500


@app.route('/api/updateCollectionStatus', methods=['POST'])
def update_collection_status():
    conn = None
    cursor = None
    try:
        # Retrieve JSON data from the request body
        data = request.get_json()

        # Extract fields
        document_id = data.get('id')
        pin = data.get('pin')
        collector_details = {
            "name": data.get('name'),
            "phone": data.get('phone'),
            "nic": data.get('nic'),
            "amount": data.get('amount')
        }
        remark = data.get('remark')  # Capture the remark

        # Validate that all required fields are present
        if not document_id or not pin or not collector_details.get('name') or not collector_details.get('phone') or not collector_details.get('nic') or not collector_details.get('amount'):
            return jsonify({"success": False, "message": "Missing required fields"}), 400

        # Get the Authorization token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"success": False, "message": "Authorization header is missing"}), 401

        # Validate token
        try:
            token = auth_header.split(" ")[1]
            decoded_token = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            user_id = decoded_token.get('user_id')
        except Exception as e:
            return jsonify({"success": False, "message": f"Invalid token: {str(e)}"}), 401

        # Database connection
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if the user PIN matches the stored PIN
        cursor.execute("SELECT authKey FROM Users WHERE user_id = ?", (user_id,))
        user = cursor.fetchone()
        if not user or user[0] != pin:  # Access the value using index (0 for authKey)
            return jsonify({"success": False, "message": "Invalid PIN"}), 403

        # Check if the document exists and retrieve the current status
        cursor.execute("SELECT status FROM invDocs WHERE id = ?", (document_id,))
        doc = cursor.fetchone()
        if not doc:
            return jsonify({"success": False, "message": "Document not found"}), 404

        current_status = doc[0]  # Access status using index (0 for status)

        # Validate the status transition
        if current_status != "3":
            return jsonify({"success": False, "message": "Invalid status transition"}), 400

        # Perform the update and insert into Collections
        collection_date = datetime.now()  # Use UTC time for collection date
        cursor.execute("""UPDATE invDocs 
                          SET status = ?,  modified_at = ?, modified_by = ? 
                          WHERE id = ? AND status = ?""",
                          ("4", collection_date, user_id,document_id,"3"))

        cursor.execute("""INSERT INTO Collections 
                          (document_id, collector_name, collector_phone, collector_nic, amount, collected_by, collected_at, remark) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                          (document_id,
                           collector_details.get("name"),
                           collector_details.get("phone"),
                           collector_details.get("nic"),
                           collector_details.get("amount"),
                           user_id,
                           collection_date,
                           remark))

        # Commit the transaction
        conn.commit()

        return jsonify({"success": True, "message": "Document marked as collected"}), 200

    except Exception as e:
        app.logger.error(f"Server error: {str(e)}")  # Log the error for debugging
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500

    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


 


@app.route('/api/getPaymentCollected', methods=['GET'])
def get_payment_collected():
    conn = None
    cursor = None
    try:
        # Retrieve the formID from query parameters
        form_id = request.args.get("formId")
        if not form_id:
            return jsonify({"error": "Missing 'formId' in request"}), 400

        # Connect to the database
        conn = get_db_connection()
        cursor = conn.cursor()

        # Execute the stored procedure with formID as a parameter
        cursor.execute("EXEC sp_ManageInvoices @FormID = ?", (form_id,))
        results = cursor.fetchall()

        # Close the database connection
        cursor.close()
        conn.close()

        # If no results are returned
        if not results:
            return jsonify({"error": "No documents found for the given formId"}), 404

        # Parse results into a list of documents
        documents = [
            {
                "id": row[0],
                "invoiceNo": row[1],
                "Company": row[2],
                "Date": row[3],
                "Remark": row[4],
                "Amount": row[5],
                "Status": row[6],
                "IsAdvancePayment": row[7],
                "CreatedUser": row[8],
                "HandoverDate": row[9],
                "Receiver": row[10],
                "Currency": row[11],
            }
            for row in results
        ]

        return jsonify(documents)

    except Exception as e:
        # Log the error for debugging
        app.logger.error(f"Error in get_pending_collections: {e}")
        return jsonify({"error": f"An error occurred: {e}"}), 500

@app.route('/api/getDepartments', methods=['GET'])
def get_departments():
    try:
        # Retrieve the formID from query parameters
        form_id = request.args.get("formId")
        if not form_id:
            return jsonify({"error": "Missing 'formId' in request"}), 400

        # Connect to the database
        conn = get_db_connection()
        cursor = conn.cursor()

        # Execute the stored procedure with formID as a parameter
        cursor.execute("EXEC sp_ManageInvoices @FormID = ?", (form_id,))
        results = cursor.fetchall()

        # Close the database connection
        cursor.close()
        conn.close()

        # If no results are returned
        if not results:
            return jsonify({"error": "No documents found for the given formId"}), 404

        # Parse results into a list of documents
        documents = [
            {
                "DID": row[0],
                "Department": row[1],
                "DepartmentCode": row[2],
                "isActive": row[3],
            }
            for row in results
        ]

        return jsonify(documents)

    except Exception as e:
        # Log the error for debugging
        app.logger.error(f"Error in get_pending_collections: {e}")
        return jsonify({"error": f"An error occurred: {e}"}), 500

@app.route('/api/po/last-po', methods=['GET'])
def get_last_po_number():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get current year
        current_year = datetime.now().year

        # Query to get the last PO number for current year
        cursor.execute("""
            SELECT TOP 1 PONumber 
            FROM PO_Header 
            WHERE PONumber LIKE ?
            ORDER BY PONumber DESC
        """, (f"{current_year}/%",))
        
        row = cursor.fetchone()
        
        if row:
            last_number = row[0]
            # Extract the numeric part
            sequence_number = int(last_number.split('/')[1]) + 1
        else:
            sequence_number = 1

        # Format new PO number
        new_po_number = f"{current_year}/{str(sequence_number).zfill(4)}"
        
        return jsonify({"poNumber": new_po_number}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/po/create', methods=['POST'])
def create_purchase_order():
    conn = None
    cursor = None
    try:
        data = request.get_json()
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"error": "Authorization header is missing"}), 401

        token = auth_header.split(" ")[1]
        decoded_token = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        created_by = decoded_token['user_id']
        current_time = datetime.now()

        # Start transaction
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Insert PO Header
        header_query = """
        INSERT INTO PO_Header (
            PONumber, SID, DID, Attendee, Description, QuotationDate, 
            Currency, Status, Total, isCreated, isApproved, isCancelled, isPrinted,
            CreatedAt, CreatedBy, Remark, DiscountPercentage, DiscountAmount,
            VATPercentage, VATAmount, TaxPercentage, TaxAmount, Type
        ) OUTPUT INSERTED.POHeaderID
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """

        header_values = (
            data['PONumber'],
            data['SID'],
            data['DID'],
            data['Attendee'],
            data['Description'],
            data['QuotationDate'],
            data['Currency'],
            data['Status'],
            data['Total'],
            data['isCreated'],
            data['isApproved'],
            data['isCancelled'],
            data['isPrinted'],
            current_time,
            created_by,
            data['Remark'],
            data['DiscountPercentage'],
            data['DiscountAmount'],
            data['VATPercentage'],
            data['VATAmount'],
            data['TaxPercentage'],
            data['TaxAmount'],
            data['Type']
        )

        cursor.execute(header_query, header_values)
        po_header_id = cursor.fetchone()[0]

        # 2. Insert PO Details
        detail_query = """
        INSERT INTO PO_Detail (
            POHeaderID, Description, LineID, Qty, UnitPrice, Total,
            PaymenTerms, Warranty, AMCTerms, DeliveryTerms, Installation,
            Validity, CreatedAt, CreatedBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """

        # Insert each line item
        for item in data['items']:
            detail_values = (
                po_header_id,
                item['Description'],
                item['LineID'],
                item['Qty'],
                item['UnitPrice'],
                item['Total'],
                item['PaymenTerms'],
                item['Warranty'],
                item['AMCTerms'],
                item['DeliveryTerms'],
                item['Installation'],
                item['Validity'],
                current_time,
                created_by
            )
            cursor.execute(detail_query, detail_values)

        conn.commit()
        return jsonify({
            "message": "Purchase order created successfully",
            "poHeaderId": po_header_id
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/po/approvals', methods=['GET'])
def get_purchase_orders():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Execute stored procedure with FormID = 10 for PO listing
        cursor.execute("EXEC sp_ManageInvoices @FormID = 10")
        rows = cursor.fetchall()
        if not rows:
            return jsonify([])

        # Format the results
        purchase_orders = []
        for row in rows:
            po = {
                "id": row[0],
                "poNumber": row[1],
                "supplierName": row[2],
                "department": row[3],
                "attendee": row[4],
                "description": row[5],
                "date": row[6].isoformat() if row[6] else None,
                "currency": row[7],
                "total": float(row[8]) if row[8] else 0,
                "status": row[9],
                "isApproved": bool(row[10]),
                "remark": row[11],
                "terms": {
                    "payment": row[12],
                    "warranty": row[13],
                    "delivery": row[14],
                    "installation": row[15],
                    "amc": row[16],
                    "validity": row[17]
                },
                "DiscountPercentage": row[18],
                "DiscountAmount": row[19],
                "VATPercentage": row[20],
                "VATAmount": row[21],
                "TaxPercentage": row[22],                
                "TaxAmount": row[23],
            }
            purchase_orders.append(po)

        return jsonify(purchase_orders)

    except Exception as e:
        print(f"Error fetching PO list: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/po/update-status', methods=['POST'])
def update_po_status():
    conn = None
    cursor = None
    try:
        data = request.get_json()
        po_id = data.get('id')
        pin = data.get('pin')
        is_print = data.get('isPrint', False)

        if not po_id or (not pin and not is_print):
            return jsonify({"success": False, "message": "Missing required fields"}), 400

        # Get user info from token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"success": False, "message": "Authorization required"}), 401

        token = auth_header.split(" ")[1]
        decoded_token = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = decoded_token.get('user_id')
        
        current_time = datetime.now()

        conn = get_db_connection()
        cursor = conn.cursor()

        if is_print:
            # Update print status
            cursor.execute("""
                UPDATE PO_Header 
                SET isPrinted = 1,
                    ModifiedAt = ?,
                    ModifiedBy = ?
                WHERE POHeaderID = ?
            """, (current_time, user_id, po_id))
        else:
            # Verify PIN first
            cursor.execute("SELECT authKey FROM Users WHERE user_id = ?", (user_id,))
            user = cursor.fetchone()
            if not user or user[0] != pin:
                return jsonify({"success": False, "message": "Invalid PIN"}), 403

            # Check current PO status
            cursor.execute("SELECT Status, isApproved FROM PO_Header WHERE POHeaderID = ?", (po_id,))
            po = cursor.fetchone()
            if not po:
                return jsonify({"success": False, "message": "PO not found"}), 404

            if po[1]:  # Check isApproved
                return jsonify({"success": False, "message": "PO already approved"}), 400

            # Update approval status
            cursor.execute("""
                UPDATE PO_Header 
                SET Status = 2,
                    isApproved = 1,
                    ApprovedBy = ?,
                    ApprovedAt = ?,
                    ModifiedAt = ?,
                    ModifiedBy = ?
                WHERE POHeaderID = ?
            """, (user_id, current_time, current_time, user_id, po_id))

        conn.commit()
        return jsonify({
            "success": True, 
            "message": "Print status updated successfully" if is_print else "PO approved successfully"
        }), 200

    except Exception as e:
        print(f"Error updating PO status: {str(e)}")
        if conn:
            conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/po/details', methods=['GET'])
def get_po_details():
    conn = None
    cursor = None
    try:
        po_header_id = request.args.get('poHeaderId')
        
        if not po_header_id:
            return jsonify({"error": "Missing POHeaderID parameter"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Execute stored procedure with FormID = 11 for PO details
            cursor.execute("""
                EXEC sp_ManageInvoices @FormID = ?, @POHeaderID = ?
            """, (11, po_header_id))
            
            rows = cursor.fetchall()
            
            if not rows:
                return jsonify([])
                
            details = [{
                "PODetaildID": row[0],
                "poHeaderId": row[1],
                "description": row[2],
                "lineId": row[3],
                "quantity": float(row[4]) if row[4] else 0,
                "unitPrice": float(row[5]) if row[5] else 0,
                "total": float(row[6]) if row[6] else 0,
                "paymentTerms": row[7],
                "warranty": row[8],
                "amcTerms": row[9],
                "deliveryTerms": row[10],
                "installation": row[11],
                "validity": row[12]
               
            } for row in rows]
                
            return jsonify(details)

        except Exception as e:
            print(f"Error executing stored procedure: {str(e)}")
            return jsonify({"error": "Error fetching PO details"}), 500

    except Exception as e:
        print(f"Error in get_po_details: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/po/approvals/<int:po_id>', methods=['GET'])
def get_po_by_id(po_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Execute stored procedure with FormID = 12 for single PO fetch
        cursor.execute("""
            EXEC sp_ManageInvoices @FormID = 12, @POHeaderID = ?
        """, (po_id,))
        
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Purchase order not found"}), 404

        po = {
            "id": row[0],
            "poNumber": row[1],
            "supplierName": row[2],
            "supplierId": row[3],
            # ...add other fields as needed...
        }
        
        return jsonify(po)

    except Exception as e:
        print(f"Error fetching PO: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == '__main__':
    app.run(debug=True)