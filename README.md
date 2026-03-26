# API Overview

This specification defines the necessary resources needed to access a patient's information and the patient's test results.

Technical documentation can be found here >

A customer orders a test kit through a website, when the test kit order is received by the customer, they register each kit to a person who will take the test. When registering the kit, they will enter a test kit ID along with their name, date of birth and other personal information.
Upon submission of the kit ID, a lab order is created. Once the customer has administered the test, they mail back the kit to the lab.

The customer can track the kit to the lab, check the status or the results, update any personal information related to the lab order.

Eight services exist to that act as a broker of information between the lab system and the website.

- A service to create a kit order request
- A service to request the delivery status of a kit
- A service to update the kit order with kit IDs
- A service to create a lab order
- A service to get all lab orders for a customer
- A service to get a specific lab order (to check the status)
- A service to update a lab order
- A service to delete a lab order
- A service to check the existence of a lab order
- A service to get the customer's Shopify orders
- A service to check the Shopify customer info 
- A service to get a specific customer's Shopify order
- A service to get a specific Shopify customer's info
- A service to get a specific Shopify order from Shopify
- A service to update a specific Shopify order in Shopify
- A service to create a test kit order in LIS (currently private)
- A service to get a test kit order from LIS (currently private)
- A service to update a test kit order in LIS (currently private)
- A service to delete a test kit order in LIS (currently private)
- A service to create a lab order in LIS (currently private)
- A service to get a lab order from LIS (currently private)
- A service to update a lab order in LIS (currently private)
- A service to update the test ordered field in lab order in LIS (currently private)
- A service to delete a lab order in LIS (currently private)


**Note: In order to differentiate a Notch order from all other orders NOTCH-{Shopify Order Number} is stored in the Test Kit's requestor field. When passing data to the test kit order only include the Shopify Order Number in the requester field for inserting and updating.**

**Same thing somewhat applies to a lab-order, except the field used is the diagnosis field, but instead of passing a Shopify Order Number the caller will had to supply a unique key that they generate and place the key in the diagnosis field.** 



**Test Kits IDs shipped are in the note field of an order and the kit-id field of a Test Kit Order**


    "kit-id": "9238928392\n293829323\n"



**Type of Test Ordered is in the sku field of a shopify line and are placed in the comment field for test kit record for convenience**

    "comment": "382,0"



## Sample Code

### Create Kit Order in LIS

**Input**

    POST
    /lis/kits-order


**Body**

    {
        "id": "28723823",
        "order-id": "3898238923",
        "customer-id": "2783",
        "prac-id": "13",
        "order-taker": "asmith",
        "requester": "827382328",
        "process-type": "",
        "loc-pos": "",
        "clinic-name": "Betty Hollow",
        "address1": "3782 Love Drive",
        "address2": "#1",
        "city": "Chicago",
        "state": "IL",
        "other-state": "",
        "zip": "60636",
        "country": "USA",
        "req-loc": "",
        "ship-method": "FED",
        "tracking-num": "29839283479382",
        "status": "",
        "comment": "",
        "kit-id": ""
    }


**Output**

    {
        "ID": 97378
    }


### Get Notch Test Kit from LIS

**Input**

    GET
    /lis/kits-order/827382328

**Output**

    [
        {
            "order_id": 97378,
            "prac_id": 13,
            "order_date": null,
            "order_taker": "asmith",
            "requester": "NOTCH-827382328",
            "process_type": "",
            "loc_pos": 0,
            "clinic_name": "Betty Hollow",
            "address1": "3782 Love Drive",
            "address2": "#1",
            "city": "Chicago",
            "state": "IL",
            "other_state": "",
            "zip": "60636",
            "country": "US",
            "req_loc": "",
            "ship_method": "FED",
            "tracking_num": "29839283479382",
            "status": "",
            "comment": ""
        }
    ]

### Update Notch Test Kit Info in LIS   

**Input**

    PUT
    /lis/kits-order/827382328

**Body**

    {
        "order-id": 97378,
        "prac-id": 13,
        "order-taker": "asmith",
        "requester": "NOTCH-827382328",
        "process-type": "",
        "loc-pos": 0,
        "clinic-name": "Betty Hollow",
        "address1": "3782 Love Drive",
        "address2": "#1",
        "city": "Chicago",
        "state": "IL",
        "other_state": "",
        "zip": "60636",
        "country": "US",
        "req-loc": "0",
        "ship-method": "FED",
        "tracking-num": "29839283479382",
        "status": "2",
        "comment": "9238928392\n293829323\n"
    }

**Output**

    {
        "Rows-affected": 1
    }

### Delete Notch Test Kit from LIS

**Input**

    DELETE
    /lis/kits-order/827382328

**Output**

    {
        "Rows-affected": 1
    }

### Create Lab Order in LIS

**Input**

    POST
    /lis/lab-order

**Output**

    {
        "prefix": "",
        "order-id": "2019029555",
        "invoice-num": "",
        "invoice-date": "",
        "prac-id": "12691",
        "prac-name": "",
        "print-batch-id": "53313",
        "loc-pos": "2",
        "owner-fname": "",
        "owner-mname": "",
        "owner-lname": "",
        "patient-fname": "Jessica",
        "patient-mname": "",
        "patient-lname": "Rabbit",
        "patient-gender": "F",
        "patient-age": "40.53",
        "patient-dob": "",
        "patient-ssn": "0",
        "patient-address": "",
        "patient-city": "",
        "patient-state": "",
        "patient-country": "US",
        "patient-zip": "",
        "patient-phday": "",
        "patient-pheve": "",
        "ship-method": "USP",
        "tracking-num": "",
        "ship-priority": "",
        "date-received": "",
        "date-drawn": "",
        "species": "human",
        "breed": "",
        "sample-type": "dbs",
        "sample-volume": "11",
        "patient-phase": "",
        "patient-cycle-day": "0",
        "patient-cycle-length": "0",
        "storage": "RT",
        "diagnoses": "",
        "icd9": "",
        "test-ordered": "382,0",
        "locale": "",
        "test-priority": "0",
        "rush-date": "",
        "bill-method": "CCDR",
        "bill-ref": "",
        "check-amount": "0.00",
        "status": "0",
        "report-template": "13",
        "comment": "",
        "entry-comment": "",
        "reject-code": "",
        "processing-comment": "1 unused. tm",
        "ordered-date": "",
        "ordered-by": "tshowers",
        "request": "8723874286372",
        "do-not-send": "N",
        "verified": "N",
        "sent-to-blis": "Y",
        "sent-to-qb": "Y",
        "label-amount": "1",
        "label-print-status": "1",
        "override-partner-processing": "N",
        "partner-id": "",
        "partner-status-id": "",
        "partner-processing-comment": "",
        "time-drawn": "",
        "time-zone-drawn": "",
        "partner-order-id": "",
        "approved-order-type-id": "0"
    }



### Create Lab Order

**Input**
    
    POST
    /lab-orders/
    

**Body**

    {
        "order-id": "29832",
        "customer-id": "2938473928",
        "prefix": "",
        "invoice-num": "",
        "invoice-date": "",
        "prac-id": "12691",
        "prac-name": "",
        "print-batch-id": "53313",
        "loc-pos": "2",
        "owner-fname": "",
        "owner-mname": "",
        "owner-lname": "",
        "patient-fname": "Jessica",
        "patient-mname": "",
        "patient-lname": "Rabbit",
        "patient-gender": "F",
        "patient-age": "40.53",
        "patient-dob": "",
        "patient-ssn": "0",
        "patient-address": "",
        "patient-city": "",
        "patient-state": "",
        "patient-country": "US",
        "patient-zip": "",
        "patient-phday": "",
        "patient-pheve": "",
        "ship-method": "USP",
        "tracking-num": "",
        "ship-priority": "",
        "date-received": "",
        "date-drawn": "",
        "species": "human",
        "breed": "",
        "sample-type": "dbs",
        "sample-volume": "11",
        "patient-phase": "",
        "patient-cycle-day": "0",
        "patient-cycle-length": "0",
        "storage": "RT",
        "diagnoses": "",
        "icd9": "",
        "test-ordered": "382,0",
        "locale": "",
        "test-priority": "0",
        "rush-date": "",
        "bill-method": "CCDR",
        "bill-ref": "",
        "check-amount": "0.00",
        "status": "0",
        "report-template": "13",
        "comment": "28736482732",
        "entry-comment": "",
        "reject-code": "",
        "processing-comment": "1 unused. tm",
        "ordered-date": "",
        "ordered-by": "tshowers",
        "request": "",
        "do-not-send": "N",
        "verified": "N",
        "sent-to-blis": "Y",
        "sent-to-qb": "Y",
        "label-amount": "1",
        "label-print-status": "1",
        "override-partner-processing": "N",
        "partner-id": "",
        "partner-status-id": "",
        "partner-processing-comment": "",
        "time-drawn": "",
        "time-zone-drawn": "",
        "partner-order-id": "",
        "approved-order-type-id": "0"
    }

**OutPut**

    {
        "status": "submitted",
        "data": {
            "lab-orders": {
                "order-id": "29832",
                "customer-id": "2938473928",
                "prefix": "",
                "invoice-num": "",
                "invoice-date": "",
                "prac-id": "15928",
                "prac-name": "",
                "print-batch-id": "53313",
                "loc-pos": "0",
                "owner-fname": "",
                "owner-mname": "",
                "owner-lname": "",
                "patient-fname": "Jessica",
                "patient-mname": "",
                "patient-lname": "Rabbit",
                "patient-gender": "F",
                "patient-age": "40.53",
                "patient-dob": "",
                "patient-ssn": "0",
                "patient-address": "",
                "patient-city": "",
                "patient-state": "",
                "patient-country": "US",
                "patient-zip": "",
                "patient-phday": "",
                "patient-pheve": "",
                "ship-method": "USP",
                "tracking-num": "",
                "ship-priority": "",
                "date-received": 1614540534155,
                "date-drawn": "",
                "species": "human",
                "breed": "",
                "sample-type": "dbs",
                "sample-volume": "11",
                "patient-phase": "",
                "patient-cycle-day": "0",
                "patient-cycle-length": "0",
                "storage": "RT",
                "diagnoses": "",
                "icd9": "",
                "test-ordered": "382,0",
                "locale": "",
                "test-priority": "0",
                "rush-date": "",
                "bill-method": "CCDR",
                "bill-ref": "",
                "check-amount": "0.00",
                "status": "0",
                "report-template": "13",
                "comment": "28736482732",
                "entry-comment": "",
                "reject-code": "",
                "processing-comment": "1 unused. tm",
                "ordered-date": "",
                "ordered-by": "tshowers",
                "request": "",
                "do-not-send": "N",
                "verified": "N",
                "sent-to-blis": "Y",
                "sent-to-qb": "Y",
                "label-amount": "1",
                "label-print-status": "1",
                "override-partner-processing": "N",
                "partner-id": "",
                "partner-status-id": "",
                "partner-processing-comment": "",
                "time-drawn": "",
                "time-zone-drawn": "",
                "partner-order-id": "",
                "approved-order-type-id": "0"
            }
        }
    }

---
### Get Lab Orders for a customer
**Input**

    GET
    /lab-orders

**Body**

    {
        "customer-id": "2938473928"
    }

**Output**

    {
        "29832": {
            "tracking-num": "",
            "date-received": 1614540534155,
            "patient-lname": "Rabbit",
            "verified": "N",
            "date-drawn": "",
            "sent-to-qb": "Y",
            "owner-fname": "",
            "patient-fname": "Jessica",
            "patient-gender": "F",
            "patient-country": "US",
            "invoice-date": "",
            "species": "human",
            "patient-state": "",
            "locale": "",
            "sample-volume": "11",
            "time-drawn": "",
            "test-ordered": "382,0",
            "bill-ref": "",
            "print-batch-id": "53313",
            "label-print-status": "1",
            "do-not-send": "N",
            "breed": "",
            "prefix": "",
            "comment": "28736482732",
            "order-id": "29832",
            "patient-pheve": "",
            "time-zone-drawn": "",
            "patient-zip": "",
            "check-amount": "0.00",
            "customer-id": "2938473928",
            "ordered-date": "",
            "patient-ssn": "0",
            "status": "0",
            "partner-id": "",
            "patient-mname": "",
            "storage": "RT",
            "patient-cycle-length": "0",
            "owner-mname": "",
            "sent-to-blis": "Y",
            "entry-comment": "",
            "reject-code": "",
            "patient-city": "",
            "bill-method": "CCDR",
            "label-amount": "1",
            "override-partner-processing": "N",
            "prac-name": "",
            "partner-status-id": "",
            "patient-age": "40.53",
            "patient-dob": "",
            "icd9": "",
            "rush-date": "",
            "request": "",
            "partner-order-id": "",
            "patient-phase": "",
            "patient-phday": "",
            "diagnoses": "",
            "test-priority": "0",
            "ship-method": "USP",
            "loc-pos": "0",
            "partner-processing-comment": "",
            "ship-priority": "",
            "approved-order-type-id": "0",
            "processing-comment": "1 unused. tm",
            "owner-lname": "",
            "patient-address": "",
            "sample-type": "dbs",
            "prac-id": "15928",
            "report-template": "13",
            "patient-cycle-day": "0",
            "invoice-num": "",
            "ordered-by": "tshowers"
        }
    }


---
### Get a specific lab order

**Input**

    GET
    /lab-orders/29832

**Output**

    {
        "patient-country": "US",
        "patient-ssn": "0",
        "locale": "",
        "ordered-date": "",
        "patient-lname": "Rabbit",
        "patient-address": "",
        "date-drawn": "",
        "patient-dob": "",
        "prefix": "",
        "check-amount": "0.00",
        "breed": "",
        "label-amount": "1",
        "order-id": "29832",
        "date-received": 1614540534155,
        "loc-pos": "0",
        "ship-method": "USP",
        "partner-order-id": "",
        "comment": "28736482732",
        "patient-zip": "",
        "storage": "RT",
        "patient-cycle-length": "0",
        "partner-id": "",
        "rush-date": "",
        "reject-code": "",
        "entry-comment": "",
        "label-print-status": "1",
        "patient-gender": "F",
        "invoice-num": "",
        "owner-lname": "",
        "request": "",
        "customer-id": "2938473928",
        "approved-order-type-id": "0",
        "partner-processing-comment": "",
        "patient-city": "",
        "patient-state": "",
        "patient-phday": "",
        "ship-priority": "",
        "partner-status-id": "",
        "sent-to-blis": "Y",
        "patient-mname": "",
        "sent-to-qb": "Y",
        "sample-volume": "11",
        "patient-cycle-day": "0",
        "override-partner-processing": "N",
        "print-batch-id": "53313",
        "sample-type": "dbs",
        "patient-age": "40.53",
        "owner-mname": "",
        "ordered-by": "tshowers",
        "time-zone-drawn": "",
        "do-not-send": "N",
        "report-template": "13",
        "verified": "N",
        "icd9": "",
        "patient-fname": "Jessica",
        "time-drawn": "",
        "patient-pheve": "",
        "test-priority": "0",
        "invoice-date": "",
        "processing-comment": "1 unused. tm",
        "bill-method": "CCDR",
        "diagnoses": "",
        "test-ordered": "382,0",
        "prac-name": "",
        "owner-fname": "",
        "bill-ref": "",
        "tracking-num": "",
        "prac-id": "15928",
        "patient-phase": "",
        "status": "0",
        "species": "human"
    }

---
### Update a lab order

**Input**

    PUT
    /lab-orders/29832

**Body**

    {
        "order-id": "29832",
        "customer-id": "2938473928",
        "prefix": "Mr.",
        "invoice-num": "",
        "invoice-date": "",
        "prac-id": "12691",
        "prac-name": "",
        "print-batch-id": "53313",
        "loc-pos": "2",
        "owner-fname": "",
        "owner-mname": "",
        "owner-lname": "",
        "patient-fname": "Jessica",
        "patient-mname": "Frammed Roger",
        "patient-lname": "Rabbit",
        "patient-gender": "F",
        "patient-age": "40.53",
        "patient-dob": "",
        "patient-ssn": "0",
        "patient-address": "",
        "patient-city": "",
        "patient-state": "",
        "patient-country": "US",
        "patient-zip": "",
        "patient-phday": "",
        "patient-pheve": "",
        "ship-method": "USP",
        "tracking-num": "",
        "ship-priority": "",
        "date-received": "",
        "date-drawn": "",
        "species": "human",
        "breed": "",
        "sample-type": "dbs",
        "sample-volume": "11",
        "patient-phase": "",
        "patient-cycle-day": "0",
        "patient-cycle-length": "0",
        "storage": "RT",
        "diagnoses": "",
        "icd9": "",
        "test-ordered": "382,0",
        "locale": "",
        "test-priority": "0",
        "rush-date": "",
        "bill-method": "CCDR",
        "bill-ref": "",
        "check-amount": "0.00",
        "status": "0",
        "report-template": "13",
        "comment": "28736482732",
        "entry-comment": "",
        "reject-code": "",
        "processing-comment": "1 unused. tm",
        "ordered-date": "",
        "ordered-by": "tshowers",
        "request": "",
        "do-not-send": "N",
        "verified": "N",
        "sent-to-blis": "Y",
        "sent-to-qb": "Y",
        "label-amount": "1",
        "label-print-status": "1",
        "override-partner-processing": "N",
        "partner-id": "",
        "partner-status-id": "",
        "partner-processing-comment": "",
        "time-drawn": "",
        "time-zone-drawn": "",
        "partner-order-id": "",
        "approved-order-type-id": "0"
    }




---
### Create a Test Kit Order

**Input**

    POST
    /test-kit-orders


**Body**

    {
        "id": "92839283",
        "order-id": "3898238923",
        "customer-id": "2783",
        "pract-id": "13",
        "order-taker": "asmith",
        "requester": "",
        "process-type": "",
        "loc-pos": "",
        "clinic-name": "Leslie Campers",
        "address1": "3782 Love Drive",
        "address2": "#1",
        "city": "Chicago",
        "state": "IL",
        "other-state": "",
        "zip": "60636",
        "country": "USA",
        "req-loc": "",
        "shipping-method": "FED",
        "tracking-num": "29839283479382",
        "status": "",
        "comment": "",
        "kit-id": ""
    }

**Output**

    {
        "status": "submitted",
        "data": {
            "test-kit-orders": {
                "order-id": "3898238923",
                "customer-id": "2783",
                "pract-id": "15928",
                "order-date": 1614294510282,
                "order-taker": "tshowers",
                "requester": "NOTCH-3898238923",
                "process-type": "2",
                "loc-pos": "0",
                "clinic-name": "Leslie Campers",
                "address1": "3782 Love Drive",
                "address2": "#1",
                "city": "Chicago",
                "state": "IL",
                "zip": "60636",
                "country": "USA",
                "req-loc": "1",
                "shipping-method": "FED",
                "tracking-num": "29839283479382",
                "processing-status": "0",
                "status": "",
                "comment": "",
                "kit-id": ""
            }
        }
    }

**Output**

    {
        "status": "submitted",
        "data": {
            "test-kit-orders": {
                "order-id": "29832",
                "customer-id": "2938473928",
                "prefix": "Mr.",
                "invoice-num": "",
                "invoice-date": "",
                "prac-id": "15928",
                "prac-name": "",
                "print-batch-id": "53313",
                "loc-pos": "0",
                "owner-fname": "",
                "owner-mname": "",
                "owner-lname": "",
                "patient-fname": "Jessica",
                "patient-mname": "Frammed Roger",
                "patient-lname": "Rabbit",
                "patient-gender": "F",
                "patient-age": "40.53",
                "patient-dob": "",
                "patient-ssn": "0",
                "patient-address": "",
                "patient-city": "",
                "patient-state": "",
                "patient-country": "US",
                "patient-zip": "",
                "patient-phday": "",
                "patient-pheve": "",
                "ship-method": "USP",
                "tracking-num": "",
                "ship-priority": "",
                "date-received": 1614542080679,
                "date-drawn": "",
                "species": "human",
                "breed": "",
                "sample-type": "dbs",
                "sample-volume": "11",
                "patient-phase": "",
                "patient-cycle-day": "0",
                "patient-cycle-length": "0",
                "storage": "RT",
                "diagnoses": "",
                "icd9": "",
                "test-ordered": "382,0",
                "locale": "",
                "test-priority": "0",
                "rush-date": "",
                "bill-method": "CCDR",
                "bill-ref": "",
                "check-amount": "0.00",
                "status": "0",
                "report-template": "13",
                "comment": "28736482732",
                "entry-comment": "",
                "reject-code": "",
                "processing-comment": "1 unused. tm",
                "ordered-date": "",
                "ordered-by": "tshowers",
                "request": "",
                "do-not-send": "N",
                "verified": "N",
                "sent-to-blis": "Y",
                "sent-to-qb": "Y",
                "label-amount": "1",
                "label-print-status": "1",
                "override-partner-processing": "N",
                "partner-id": "",
                "partner-status-id": "",
                "partner-processing-comment": "",
                "time-drawn": "",
                "time-zone-drawn": "",
                "partner-order-id": "",
                "approved-order-type-id": "0"
            }
        }
    }

---
### See if lab order exist

**Input**    

    HEAD
    /lab-orders/29832

**Output**

    No out expected but response code should be 200 (exists) or 404 (does not exist)

---
### Delete a lab order

**Input**

    DELETE
    /lab-orders/29832

**Output**

    If delete successfully should receive a response code of 410


---
### Get test kit order for supplied order ID

**Input**

    GET
    /test-kit-orders/0001

**Output**

    {
      "clinic-pract-id": "Phyllis Diller",
      "tracking": "569830741673",
      "order-taken-by": "amyrs",
      "shipping-location-state": "IL",
      "kit-id": "",
      "shipping-location-zip": "60636",
      "shipping-location-city": "Chicago",
      "shipping-location-country": "USA",
      "order-date": 1613600701559,
      "phone-number": "312.777.9311",
      "shipping-name": "Phyllis Diller",
      "current-status": "SHIPPED",
      "kit-type": "Fingerstick - DBS = 3",
      "shipping-method": "FED",
      "processing-status": "STANDARD",
      "supplies-type": "Serum = 2",
      "shipping-location-address": "2298 N Drive Lane",
      "comment": "",
      "name-of-requester": "shopify",
      "order-id": "0001",
      "customer-id": "12",
      "verify-entry": true
    }

---
### Get a cloud order (which is the auhoritative source)

**Input**

    GET
    /orders/3235450159265

**Output**

    {
        "current_total_duties_set": null,
        "gateway": "shopify_payments",
        "total_tax_set": {
            "presentment_money": {
                "currency_code": "USD",
                "amount": "10.72"
            },
            "shop_money": {
                "amount": "10.72",
                "currency_code": "USD"
            }
        },
        "landing_site": "/account/login?return_url=/account",
        "tags": "",
        "total_tax": "10.72",
        "billing_address": {
            "province_code": "WA",
            "address2": "",
            "last_name": "Zambrano",
            "country_code": "US",
            "latitude": 47.6735239,
            "country": "United States",
            "name": "Juan Zambrano",
            "address1": "10376 Northeast Sasquatch Lane",
            "phone": "(206) 247-1639",
            "zip": "98110",
            "city": "Bainbridge Island",
            "company": "",
            "province": "Washington",
            "longitude": -122.511774,
            "first_name": "Juan"
        },
        "checkout_token": "1fb39b400c167592328606a41b97a9a6",
        "cart_token": "d6e3de7d0be52528cea501847e8d16e9",
        "refunds": [],
        "closed_at": null,
        "order_status_url": "https://notch.health/53169258657/orders/e697d35cbcb9540b23e3e3bb0ec2415b/authenticate?key=715422b728c3510ff2f4611f3c1307f8",
        "presentment_currency": "USD",
        "discount_applications": [],
        "total_line_items_price": "119.00",
        "id": 3235450159265,
        "test": true,
        "shipping_address": {
            "last_name": "Zambrano",
            "company": "",
            "latitude": 47.6735239,
            "longitude": -122.511774,
            "address1": "10376 Northeast Sasquatch Lane",
            "zip": "98110",
            "country_code": "US",
            "name": "Juan Zambrano",
            "first_name": "Juan",
            "city": "Bainbridge Island",
            "province_code": "WA",
            "province": "Washington",
            "country": "United States",
            "address2": "",
            "phone": "(206) 247-1639"
        },
        "referring_site": "https://notch.health/",
        "reference": null,
        "created_at": "2021-02-23T14:36:47-08:00",
        "buyer_accepts_marketing": true,
        "financial_status": "paid",
        "contact_email": "jzambrano@notch.health",
        "taxes_included": false,
        "original_total_duties_set": null,
        "total_discounts_set": {
            "presentment_money": {
                "currency_code": "USD",
                "amount": "0.00"
            },
            "shop_money": {
                "amount": "0.00",
                "currency_code": "USD"
            }
        },
        "location_id": null,
        "cancel_reason": null,
        "subtotal_price": "119.00",
        "total_weight": 0,
        "fulfillment_status": null,
        "admin_graphql_api_id": "gid://shopify/Order/3235450159265",
        "customer_locale": "en",
        "updated_at": "2021-02-24T14:11:45-08:00",
        "processing_method": "direct",
        "discount_codes": [],
        "total_price": "129.72",
        "app_id": 580111,
        "client_details": {
            "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36",
            "accept_language": "en-US,en;q=0.9,es;q=0.8",
            "browser_ip": "50.125.98.61",
            "browser_width": 2126,
            "browser_height": 1304,
            "session_hash": null
        },
        "confirmed": true,
        "landing_site_ref": null,
        "cancelled_at": null,
        "tax_lines": [
            {
                "price_set": {
                    "shop_money": {
                        "amount": "2.98",
                        "currency_code": "USD"
                    },
                    "presentment_money": {
                        "currency_code": "USD",
                        "amount": "2.98"
                    }
                },
                "title": "Bainbridge Island City Tax",
                "price": "2.98",
                "rate": 0.025
            },
            {
                "price": "7.74",
                "rate": 0.065,
                "price_set": {
                    "shop_money": {
                        "currency_code": "USD",
                        "amount": "7.74"
                    },
                    "presentment_money": {
                        "amount": "7.74",
                        "currency_code": "USD"
                    }
                },
                "title": "Washington State Tax"
            }
        ],
        "total_shipping_price_set": {
            "shop_money": {
                "currency_code": "USD",
                "amount": "0.00"
            },
            "presentment_money": {
                "amount": "0.00",
                "currency_code": "USD"
            }
        },
        "subtotal_price_set": {
            "shop_money": {
                "currency_code": "USD",
                "amount": "119.00"
            },
            "presentment_money": {
                "currency_code": "USD",
                "amount": "119.00"
            }
        },
        "payment_gateway_names": [
            "shopify_payments"
        ],
        "processed_at": "2021-02-23T14:36:46-08:00",
        "checkout_id": 16778817568929,
        "total_price_usd": "129.72",
        "phone": null,
        "currency": "USD",
        "source_name": "web",
        "user_id": null,
        "payment_details": {
            "cvv_result_code": "M",
            "credit_card_company": "Visa",
            "avs_result_code": "Y",
            "credit_card_bin": "424242",
            "credit_card_number": "•••• •••• •••• 4242"
        },
        "line_items": [
            {
                "total_discount_set": {
                    "presentment_money": {
                        "amount": "0.00",
                        "currency_code": "USD"
                    },
                    "shop_money": {
                        "currency_code": "USD",
                        "amount": "0.00"
                    }
                },
                "variant_id": 37719177298081,
                "admin_graphql_api_id": "gid://shopify/LineItem/6679708827809",
                "requires_shipping": true,
                "fulfillment_service": "manual",
                "price": "119.00",
                "tax_lines": [
                    {
                        "price_set": {
                            "presentment_money": {
                                "amount": "2.98",
                                "currency_code": "USD"
                            },
                            "shop_money": {
                                "currency_code": "USD",
                                "amount": "2.98"
                            }
                        },
                        "title": "Bainbridge Island City Tax",
                        "price": "2.98",
                        "rate": 0.025
                    },
                    {
                        "price_set": {
                            "presentment_money": {
                                "amount": "7.74",
                                "currency_code": "USD"
                            },
                            "shop_money": {
                                "amount": "7.74",
                                "currency_code": "USD"
                            }
                        },
                        "title": "Washington State Tax",
                        "price": "7.74",
                        "rate": 0.065
                    }
                ],
                "fulfillable_quantity": 1,
                "discount_allocations": [],
                "variant_title": "",
                "price_set": {
                    "presentment_money": {
                        "amount": "119.00",
                        "currency_code": "USD"
                    },
                    "shop_money": {
                        "amount": "119.00",
                        "currency_code": "USD"
                    }
                },
                "title": "COVID-19 Home Test",
                "product_id": 6071369007265,
                "gift_card": false,
                "variant_inventory_management": "shopify",
                "duties": [],
                "fulfillment_status": null,
                "quantity": 1,
                "vendor": "NotchHealth",
                "origin_location": {
                    "city": "Seattle",
                    "zip": "98122",
                    "province_code": "WA",
                    "id": 2670784774305,
                    "name": "Notch Health",
                    "country_code": "US",
                    "address2": "Suite 200",
                    "address1": "300 East Pike Street"
                },
                "taxable": true,
                "properties": [],
                "name": "COVID-19 Home Test",
                "total_discount": "0.00",
                "product_exists": true,
                "id": 6679708827809,
                "sku": "",
                "grams": 0
            }
        ],
        "note_attributes": [],
        "total_tip_received": "0.0",
        "device_id": null,
        "total_line_items_price_set": {
            "shop_money": {
                "amount": "119.00",
                "currency_code": "USD"
            },
            "presentment_money": {
                "amount": "119.00",
                "currency_code": "USD"
            }
        },
        "shipping_lines": [
            {
                "phone": null,
                "title": "Standard",
                "delivery_category": null,
                "discounted_price_set": {
                    "shop_money": {
                        "currency_code": "USD",
                        "amount": "0.00"
                    },
                    "presentment_money": {
                        "currency_code": "USD",
                        "amount": "0.00"
                    }
                },
                "id": 2604317900961,
                "requested_fulfillment_service_id": null,
                "carrier_identifier": null,
                "price_set": {
                    "shop_money": {
                        "amount": "0.00",
                        "currency_code": "USD"
                    },
                    "presentment_money": {
                        "amount": "0.00",
                        "currency_code": "USD"
                    }
                },
                "code": "Standard",
                "price": "0.00",
                "source": "shopify",
                "discounted_price": "0.00",
                "discount_allocations": [],
                "tax_lines": [
                    {
                        "price": "0.00",
                        "rate": 0.025,
                        "title": "Bainbridge Island City Tax",
                        "price_set": {
                            "presentment_money": {
                                "amount": "0.00",
                                "currency_code": "USD"
                            },
                            "shop_money": {
                                "amount": "0.00",
                                "currency_code": "USD"
                            }
                        }
                    },
                    {
                        "title": "Washington State Tax",
                        "price": "0.00",
                        "rate": 0.065,
                        "price_set": {
                            "shop_money": {
                                "amount": "0.00",
                                "currency_code": "USD"
                            },
                            "presentment_money": {
                                "currency_code": "USD",
                                "amount": "0.00"
                            }
                        }
                    }
                ]
            }
        ],
        "note": "7630054475702\n7630054474606\n",
        "browser_ip": "50.125.98.61",
        "total_discounts": "0.00",
        "token": "e697d35cbcb9540b23e3e3bb0ec2415b",
        "email": "jzambrano@notch.health",
        "source_identifier": null,
        "number": 3,
        "name": "#1003",
        "fulfillments": [],
        "order_number": 1003,
        "customer": {
            "orders_count": 0,
            "last_name": "Zambrano",
            "accepts_marketing_updated_at": "2021-02-17T11:46:40-08:00",
            "total_spent": "0.00",
            "id": 4616784183457,
            "currency": "USD",
            "multipass_identifier": null,
            "verified_email": true,
            "accepts_marketing": true,
            "updated_at": "2021-02-23T14:36:48-08:00",
            "tax_exempt": false,
            "tags": "",
            "admin_graphql_api_id": "gid://shopify/Customer/4616784183457",
            "email": "jzambrano@notch.health",
            "phone": null,
            "created_at": "2021-02-17T11:46:39-08:00",
            "first_name": "Juan",
            "marketing_opt_in_level": "single_opt_in",
            "state": "disabled",
            "note": null,
            "default_address": {
                "country": "United States",
                "province": "Washington",
                "last_name": "Zambrano",
                "name": "Juan Zambrano",
                "country_name": "United States",
                "first_name": "Juan",
                "city": "Bainbridge Island",
                "address2": "",
                "default": true,
                "province_code": "WA",
                "company": "",
                "customer_id": 4616784183457,
                "zip": "98110",
                "id": 5327420358817,
                "country_code": "US",
                "phone": "(206) 247-1639",
                "address1": "10376 Northeast Sasquatch Lane"
            },
            "last_order_name": null,
            "last_order_id": null
        },
        "total_price_set": {
            "presentment_money": {
                "currency_code": "USD",
                "amount": "129.72"
            },
            "shop_money": {
                "currency_code": "USD",
                "amount": "129.72"
            }
        },
        "source_url": null
    }

---
### Get a cloud order based on the email address

**Input**

    GET
    /orders


 **Body**

    {
        "email": "jzambrano@notch.health"
    }   


**Output**

    {
        "total_price_set": {
            "shop_money": {
                "amount": "129.72",
                "currency_code": "USD"
            },
            "presentment_money": {
                "amount": "129.72",
                "currency_code": "USD"
            }
        },
        "cancelled_at": null,
        "shipping_address": {
            "address1": "10376 Northeast Sasquatch Lane",
            "country_code": "US",
            "address2": "",
            "zip": "98110",
            "last_name": "Zambrano",
            "longitude": -122.511774,
            "province": "Washington",
            "phone": "(206) 247-1639",
            "country": "United States",
            "province_code": "WA",
            "first_name": "Juan",
            "latitude": 47.6735239,
            "company": "",
            "city": "Bainbridge Island",
            "name": "Juan Zambrano"
        },
        "total_line_items_price_set": {
            "presentment_money": {
                "currency_code": "USD",
                "amount": "119.00"
            },
            "shop_money": {
                "currency_code": "USD",
                "amount": "119.00"
            }
        },
        "total_price": "129.72",
        "shipping_lines": [
            {
                "code": "Standard",
                "discount_allocations": [],
                "source": "shopify",
                "id": 2604317900961,
                "carrier_identifier": null,
                "title": "Standard",
                "price": "0.00",
                "discounted_price": "0.00",
                "requested_fulfillment_service_id": null,
                "price_set": {
                    "presentment_money": {
                        "amount": "0.00",
                        "currency_code": "USD"
                    },
                    "shop_money": {
                        "amount": "0.00",
                        "currency_code": "USD"
                    }
                },
                "tax_lines": [
                    {
                        "rate": 0.025,
                        "price": "0.00",
                        "price_set": {
                            "shop_money": {
                                "currency_code": "USD",
                                "amount": "0.00"
                            },
                            "presentment_money": {
                                "currency_code": "USD",
                                "amount": "0.00"
                            }
                        },
                        "title": "Bainbridge Island City Tax"
                    },
                    {
                        "price_set": {
                            "shop_money": {
                                "currency_code": "USD",
                                "amount": "0.00"
                            },
                            "presentment_money": {
                                "amount": "0.00",
                                "currency_code": "USD"
                            }
                        },
                        "title": "Washington State Tax",
                        "rate": 0.065,
                        "price": "0.00"
                    }
                ],
                "discounted_price_set": {
                    "presentment_money": {
                        "amount": "0.00",
                        "currency_code": "USD"
                    },
                    "shop_money": {
                        "currency_code": "USD",
                        "amount": "0.00"
                    }
                },
                "delivery_category": null,
                "phone": null
            }
        ],
        "subtotal_price": "119.00",
        "note": "7630054475702\n7630054474606\n",
        "checkout_token": "1fb39b400c167592328606a41b97a9a6",
        "financial_status": "paid",
        "location_id": null,
        "name": "#1003",
        "landing_site_ref": null,
        "buyer_accepts_marketing": true,
        "original_total_duties_set": null,
        "device_id": null,
        "refunds": [],
        "subtotal_price_set": {
            "presentment_money": {
                "amount": "119.00",
                "currency_code": "USD"
            },
            "shop_money": {
                "currency_code": "USD",
                "amount": "119.00"
            }
        },
        "test": true,
        "email": "jzambrano@notch.health",
        "contact_email": "jzambrano@notch.health",
        "total_tip_received": "0.0",
        "processed_at": "2021-02-23T14:36:46-08:00",
        "reference": null,
        "created_at": "2021-02-23T14:36:47-08:00",
        "user_id": null,
        "discount_codes": [],
        "number": 3,
        "phone": null,
        "cancel_reason": null,
        "payment_details": {
            "credit_card_company": "Visa",
            "cvv_result_code": "M",
            "credit_card_number": "•••• •••• •••• 4242",
            "credit_card_bin": "424242",
            "avs_result_code": "Y"
        },
        "closed_at": null,
        "total_tax": "10.72",
        "order_status_url": "https://notch.health/53169258657/orders/e697d35cbcb9540b23e3e3bb0ec2415b/authenticate?key=715422b728c3510ff2f4611f3c1307f8",
        "confirmed": true,
        "note_attributes": [],
        "client_details": {
            "session_hash": null,
            "browser_height": 1304,
            "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36",
            "browser_ip": "50.125.98.61",
            "accept_language": "en-US,en;q=0.9,es;q=0.8",
            "browser_width": 2126
        },
        "discount_applications": [],
        "tags": "",
        "source_name": "web",
        "payment_gateway_names": [
            "shopify_payments"
        ],
        "token": "e697d35cbcb9540b23e3e3bb0ec2415b",
        "total_discounts": "0.00",
        "order_number": 1003,
        "total_shipping_price_set": {
            "presentment_money": {
                "amount": "0.00",
                "currency_code": "USD"
            },
            "shop_money": {
                "amount": "0.00",
                "currency_code": "USD"
            }
        },
        "line_items": [
            {
                "variant_title": "",
                "title": "COVID-19 Home Test",
                "total_discount": "0.00",
                "id": 6679708827809,
                "fulfillment_status": null,
                "gift_card": false,
                "fulfillable_quantity": 1,
                "requires_shipping": true,
                "grams": 0,
                "quantity": 1,
                "vendor": "NotchHealth",
                "total_discount_set": {
                    "shop_money": {
                        "amount": "0.00",
                        "currency_code": "USD"
                    },
                    "presentment_money": {
                        "currency_code": "USD",
                        "amount": "0.00"
                    }
                },
                "variant_id": 37719177298081,
                "product_id": 6071369007265,
                "variant_inventory_management": "shopify",
                "admin_graphql_api_id": "gid://shopify/LineItem/6679708827809",
                "tax_lines": [
                    {
                        "title": "Bainbridge Island City Tax",
                        "price_set": {
                            "presentment_money": {
                                "currency_code": "USD",
                                "amount": "2.98"
                            },
                            "shop_money": {
                                "amount": "2.98",
                                "currency_code": "USD"
                            }
                        },
                        "rate": 0.025,
                        "price": "2.98"
                    },
                    {
                        "rate": 0.065,
                        "price_set": {
                            "shop_money": {
                                "amount": "7.74",
                                "currency_code": "USD"
                            },
                            "presentment_money": {
                                "amount": "7.74",
                                "currency_code": "USD"
                            }
                        },
                        "price": "7.74",
                        "title": "Washington State Tax"
                    }
                ],
                "properties": [],
                "origin_location": {
                    "zip": "98122",
                    "city": "Seattle",
                    "country_code": "US",
                    "name": "Notch Health",
                    "id": 2670784774305,
                    "province_code": "WA",
                    "address1": "300 East Pike Street",
                    "address2": "Suite 200"
                },
                "taxable": true,
                "duties": [],
                "sku": "",
                "name": "COVID-19 Home Test",
                "price_set": {
                    "presentment_money": {
                        "currency_code": "USD",
                        "amount": "119.00"
                    },
                    "shop_money": {
                        "amount": "119.00",
                        "currency_code": "USD"
                    }
                },
                "discount_allocations": [],
                "product_exists": true,
                "fulfillment_service": "manual",
                "price": "119.00"
            }
        ],
        "processing_method": "direct",
        "id": 3235450159265,
        "source_url": null,
        "checkout_id": 16778817568929,
        "total_tax_set": {
            "presentment_money": {
                "currency_code": "USD",
                "amount": "10.72"
            },
            "shop_money": {
                "amount": "10.72",
                "currency_code": "USD"
            }
        },
        "browser_ip": "50.125.98.61",
        "cart_token": "d6e3de7d0be52528cea501847e8d16e9",
        "total_weight": 0,
        "source_identifier": null,
        "admin_graphql_api_id": "gid://shopify/Order/3235450159265",
        "fulfillments": [],
        "gateway": "shopify_payments",
        "total_line_items_price": "119.00",
        "billing_address": {
            "phone": "(206) 247-1639",
            "province_code": "WA",
            "province": "Washington",
            "last_name": "Zambrano",
            "first_name": "Juan",
            "address1": "10376 Northeast Sasquatch Lane",
            "zip": "98110",
            "country": "United States",
            "longitude": -122.511774,
            "company": "",
            "latitude": 47.6735239,
            "name": "Juan Zambrano",
            "city": "Bainbridge Island",
            "address2": "",
            "country_code": "US"
        },
        "app_id": 580111,
        "taxes_included": false,
        "landing_site": "/account/login?return_url=/account",
        "presentment_currency": "USD",
        "current_total_duties_set": null,
        "total_discounts_set": {
            "presentment_money": {
                "amount": "0.00",
                "currency_code": "USD"
            },
            "shop_money": {
                "amount": "0.00",
                "currency_code": "USD"
            }
        },
        "updated_at": "2021-02-24T14:11:45-08:00",
        "customer_locale": "en",
        "referring_site": "https://notch.health/",
        "tax_lines": [
            {
                "rate": 0.025,
                "price_set": {
                    "presentment_money": {
                        "amount": "2.98",
                        "currency_code": "USD"
                    },
                    "shop_money": {
                        "amount": "2.98",
                        "currency_code": "USD"
                    }
                },
                "price": "2.98",
                "title": "Bainbridge Island City Tax"
            },
            {
                "title": "Washington State Tax",
                "price_set": {
                    "shop_money": {
                        "currency_code": "USD",
                        "amount": "7.74"
                    },
                    "presentment_money": {
                        "currency_code": "USD",
                        "amount": "7.74"
                    }
                },
                "price": "7.74",
                "rate": 0.065
            }
        ],
        "fulfillment_status": null,
        "customer": {
            "marketing_opt_in_level": "single_opt_in",
            "last_order_name": null,
            "phone": null,
            "updated_at": "2021-02-23T14:36:48-08:00",
            "note": null,
            "total_spent": "0.00",
            "admin_graphql_api_id": "gid://shopify/Customer/4616784183457",
            "last_name": "Zambrano",
            "tags": "",
            "accepts_marketing": true,
            "first_name": "Juan",
            "default_address": {
                "default": true,
                "last_name": "Zambrano",
                "phone": "(206) 247-1639",
                "city": "Bainbridge Island",
                "address2": "",
                "country_code": "US",
                "company": "",
                "first_name": "Juan",
                "country": "United States",
                "name": "Juan Zambrano",
                "province_code": "WA",
                "id": 5327420358817,
                "address1": "10376 Northeast Sasquatch Lane",
                "province": "Washington",
                "customer_id": 4616784183457,
                "country_name": "United States",
                "zip": "98110"
            },
            "created_at": "2021-02-17T11:46:39-08:00",
            "id": 4616784183457,
            "currency": "USD",
            "orders_count": 0,
            "email": "jzambrano@notch.health",
            "accepts_marketing_updated_at": "2021-02-17T11:46:40-08:00",
            "tax_exempt": false,
            "state": "disabled",
            "multipass_identifier": null,
            "last_order_id": null,
            "verified_email": true
        },
        "currency": "USD",
        "total_price_usd": "129.72"
    }

---


## API Goal
This document describes a recommended REST resource URIs and datasets to expedite load and offer a developer-friendly interface. Currently, access to lab results is a internal process. Hence the goal is to; provide easy way for external sources to exhange test results, associate kits to patients, check test status, or initiate a lab test.

## Approach
Further, the document also maps out a plan for supporting future REST resources that add value for developers. This framework reuses design and best practices. Aspects of REST design, such as the kinds of resources, are easily described by URLs. Other aspects are not described well by resources, such as invariants, functions, and objects maintained by an ensemble. The fact that some elements are not expressed well as resources makes a REST framework harder to design. A good REST design emphasizes data details at the expense of functions. A good REST framework concentrates on describing data objects retrieved via HTTP or any other protocol. Dataflow is de-emphasized, rather emphasis is placed on the communication between the client. Since a framework provides an abstraction, users of this REST framework should ignore the details of any algorithms and concentrate on designing and combining data elements. Abstraction is defined either by how to recognize resources or how to use resources. Additional REST resources act as placeholders to depict a future implementation path.

When initiating a new test, the name of the resource is given by the server. When the server assigns the name, use a POST verb. The server should return a status of 201 with a location header parameter of the value specifying the location of the resource. A benefit of allowing the server to assign the resource name is to avoid naming conflicts.

The GET HTTP verb is used to retrieve a representation of a resource i.e., the test results. The request contains no body but may contain headers. The GET method returns a collection or individual resource. The desired representation format is implicit or explicit (accept header given).
An update to a resource occurs when one or more attributes of an existing resource require changes. Typically, changes use the HTTP verb PUT. However, there are times when a POST is used. Below are the conditions for which HTTP verb to use.

- PUT - Send full resource representation in the entity body. In other words, replace not update.

- POST – Subset of a resource's parameters requires updates. The full resource is not included in the entity body; however, the server needs to be aware of the partial update, and the resource needs to be different from any other operations (i.e. Create) that use the POST verb.

In either case, the full path to the resource must be specified in the URL. To reiterate, the path that points to the specific resource must be provided, a successful update should return an HTTP 204 with an empty entity-body. Any returned metadata is contained in the entity-headers. In some instances, there may be a need to return an entity-body. For example, if the values of any of the parameters in the response are different from what is specified in the request, the entity-body of the full resource is returned.

Use the HTTP verb DELETE when deleting a resource. For a successful deletion, an HTTP 204 status code is returned.

## References
The following checklist was used in the construction of the REST resources:

- Uniform Resource Locators (RFC 1738)
- HTTP Standards (rfc1945, rfc7230, rfc7231, rfc7232, rfc7233, rfc7234 and rfc7235)

## Notch REST Design Guide
- Keep a simple URL structure - https://support.google.com/webmasters/answer/76329?hl=en
- Use canonical URLs https://support.google.com/webmasters/answer/139066?hl=en

## Design Guidelines
The following checklist was used in the construction of the REST resources:

- No verbs in the URL resource definition
- Following the REST design pattern /{plural-noun}/{ID}/{plural-noun}/{ID}...
- Resource-restrictive URI
- Ensuring REST resource is stateless
- Not using REST as function calls
- No abbreviations in the names (except for ID)
- Identifying the data entities and not focusing on functions
- Integration with other projects or application consideration
- Making sure REST resource can be controlled by the caller/client
- The REST resource name is a noun and easy to recognize
- The REST resource does not use spaces in the name
- The slash in the URI should express a parent-child relationship
- The REST resource only uses the query string when necessary
- The REST resource does not derive metadata from the URI
- The REST resource is client side cacheable
- The REST resource is explicitly using HTTP actions (PUT, POST, DELETE, GET, HEAD)
- The response returns a request ID for troubleshooting purposes
- The resource is lowercase
- Payload is simple, human readable
- Resource fully documented?

## Technology Stack
### Interface
- Nodejs
### Database
- Google Firestore
- MySQL
### Platform Pipeline
- Hosted code and with syntax pipeline on BitBucket
- Docker Container
- Google Cloud Build
- Google Container Registry
- Google Cloud Run
- Google Service Accounts
- Google Pub/Sub

# Project Overview

## Description

A frictionless self serve website allows a user to order test kits and see the test results.

Provide customers with crucial elements left out of most competitor solutions and a clear road map for the test kit ordering process.

Ensure an inherent configurable business process based on the flow of information through natural linkages of business activities.

Utilize integration as a portal to the business process, and create real-time snapshots of the customer.

If well-planned, we will offer a unique ability to access and manage structured or unstructured content, whether it resides in ERP, CRM, HR, documents, or legacy systems.

The challenge is for the internals to be flexible enough to adapt to the various formats, standards, protocols, and procedures inside the organization.

A focus on module development should bridge the application gap. The modules should allow us to aggregate information without having to agonize over custom coding.

---

## Goals

- Passwordless
- HIPPA Compliant
- 90% or above audit
- 95% code quality
- Frictionless user experience
- Kit tracking end-to-end
- True Agile Development
- Kit ID and Order Sync across systems
- Associate kit ID with user after order complete
- Containerized
- Continuous Integration and Continuous Deployement

---

## Scope

- Shopfiy Shopping Experience integration
- User Test Portal integration
- Cloud Interface to Test Kit and Lab Order data

---

## Technology

Since the project has a very short time and the current infrastruce is fragile, after looking at AWS, Azure and Google's cloud offerings, the decision to go with Google's toolset is palable due to:
- Enthusiastic support
- Simple and easier to use interface
- Documentation with examples
- Clear definitive instructional videos

# Project Considerations

## Online Marketing

- Social Apps
- Web Analytics
- Reviews and Rating
- Search Engine Optimization
- Campaign Management
- Digital Marketing

## Compliance Management

- Security
- Compliance

## Online Shopping

- User Experience
- Search/Browse
- Cart
- CheckOut
- Merchandising
- Web Portal
- Personalization
- Content Management

## Supply Chain Integration

- Order Management
- Inventory Management
- Returns
- Warehouse
- Transportation
- Delivery
- Payment Systems
- Reporting
- Fraud

## Product Management

- Product and Pricing
- Loyalty Management

## Channel Integration

- Call/Contact Center
- Instore Apps
- Partner Apps

## Capacity Management

- Infrastructure
- Performance



# Architecture

![Archictecture](/images/readme/HA-Arch.jpg)


## Principles
- Horizontal Data Growth
- Decoupling
- Data consistency across service lines
- Serve only data needed by client
- Let the computer do most of the work the user usually does
- Frictionless user Interaction
- Audit score of 90% or better

# Project Setup Steps
## Nodejs 
    npm init -f
    git init
    git add .
    git commit  -m “[verbiage]”
    git branch -M main
    git remote add origin [Repository URL]
    git fetch
    git merge

(have to do this with Bitbucket for some reason)

    git pull origin main --allow-unrelated-histories 
    git push -u origin main

## Libraries

    npm install --save express
    npm install --save body-parser
    npm install --save dotenv
    npm install --save @google-cloud/firestore
    npm install --save axios
    npm install eslint
    npx eslint --init
    npm install nodemon --save-dev
    
- [ ] Create an **index.js** file preferably in a **/src** directory
    touch src/index.js

- [ ] In the **index.js** file just stub some simple code to test out the pipeline.

**index.js**

    const express = require('express')
    const app = express()

    app.get('/', function (req, res) {
        console.log('hello-cloud-run', 'request received');

    const target = process.env.TARGET || 'Juan';
    res.send(`Hello ${target} from Notch - Shopify Webhooks!`);
    });

    const port = process.env.PORT || 8080;

    app.listen(port,  () => {
        console.log('Webhook app listening on port ', port);
    });

## Package.json
Modify script tag the following to the following:

    "scripts": {
        "test": "echo \"Error: no test specified\" && exit 1",
        "start": "node src/index.js"
      },
    

## Container
Create a **Dockerfile** in root directory

**Dockerfile**

    FROM node:14

    WORKDIR /app

    COPY package*.json ./

    RUN npm install --only=production

    COPY . . 

    CMD ["npm", "start"]


Add a **.dockerignore** file to the root and add the following.

    node_modules

Test out docker build with an arbitrary project name you create.

    docker ps

    docker build -t [arbitrary-project-name] .

    docker run -it -p 8080:8080 [same-project-name]


## Google Cloud Platform
- [ ] Create a cloud project from the Google Cloud console.

- [ ] Go to **Google Cloud Build** service and enable service. Also go to **Google Cloud Build > Settings** and enable **Cloud Run** and **Service Accounts**. 

- [ ] Click **Connect Repository** button and go through steps to connect, authorize and connect BitBucket repository.

- [ ] After repository connected click **Create Trigger** and follow the steps, some fields should be prepopulated. On this initial trigger setup choose **Dockerfile** for **Build Configuration**. *Note: this will get changed later to cloudbuild.yaml.*

- [ ] AFter creation run the trigger to see if it works - running the trigger should push a container to **Google Container Registry**.

- [ ] Click **History** to see the log of how the trigger ran and what it actually did.

- [ ] Now go to **Cloud Run** and enable it if it's not already enabled. 

- [ ] Click **Create Service**. In the steps of creating the service select container registry image just created in the trigger step. *Note: If code is for a web browser allow authentication is mandatory else require authentication.- [ ] Click **Create** button.  

*Fun fact Google Cloud Run is built on top of a hosted open source application called K-Native which runs on top of service mesh hub by Istio, which runs on top of Kubernates.*

After creation there should be an endpoint generated, click the generated URL to see if the application works. If it works then the CI/CD pipeline is almost setup. There are a few more steps to have the process fully automated.

- [ ] Go back to **Cloud Build** > **Triggers** and change configuration build from Dockerfile to cloudbuild.yaml.

- [ ] To get a cloudbuild.yaml template go to https://cloud.google.com/build/docs/build-config to grab the syntax.

- [ ] Create a cloudbuild.yaml in the project root and edit yaml file to something that looks like the following:

**cloudbuild.yaml**

    steps:
    - name: 'gcr.io/cloud-builders/docker'
      args: ['build', '-t', 'gcr.io/[google project name]/bitbucket.org/us-biotek/[container name]:$SHORT_SHA', '.']
    - name: 'gcr.io/cloud-builders/docker'
      args: ['push', 'gcr.io/[google project name]/bitbucket.org/us-biotek/[container name]:$SHORT_SHA']



- [ ] Commit yaml file BitBucket and a pipeline should kit off. Check **Cloud Build** logs to check the progress and status of the build.

- [ ] Now lets first manually deploy the container to test it out. Activate Google's Cloud Shell (this make take some time).

- [ ] Check which services are running because the information will be needed in the next step.

**Cloud Shell**
    
    gcloud run services list to show service name

The deploy command will look something like this.

    gcloud run deploy notchwebhook-service --region=us-west1 --platform=managed --image=gcr.io/[google project name]/bitbucket.org/us-biotek/[container name]:d2461fa

On success add to the command to the cloudbuild.yaml file in the project.

    steps:
    - name: 'gcr.io/cloud-builders/docker'
      args: ['build', '-t', 'gcr.io/[google project name]/bitbucket.org/us-biotek/[container name]:$SHORT_SHA', '.']
    - name: 'gcr.io/cloud-builders/docker'
      args: ['push', 'gcr.io/[google project name]/bitbucket.org/us-biotek/[container name]:$SHORT_SHA']
    - name: 'gcr.io/cloud-builders/gcloud'
      args: ['run', 'deploy', '[google service name]', '--region=us-west1', '--platform=managed', '--image=gcr.io/[google project name]/bitbucket.org/us-biotek/[container name]:$SHORT_SHA']

- [ ] Check in updated cloudbuild.yaml file. Complete pipeline should be setup.

---


# Shopify Intetgration

## Shopify Webhooks Example

    // For Shopify webhook parsing
    const app = express();
    app.use('/webhooks', bodyParser.raw({ type: 'application/json' }))
    app.use(bodyParser.json());

**Example Shopfiy Hook**

    // Order created in Shopify
    app.post('/webhooks/orders/create', async (req, res) => {
    console.log('🎉 We got an order!')

    // we'll compare the hmac to our own hash
    const hmac = req.get('X-Shopify-Hmac-Sha256')

    // create a hash using the body and our key
    const hash = crypto
      .createHmac('sha256', process.env.SHOPIFY_API_WEBHOOK)
      .update(req.body, 'utf8', 'hex')
      .digest('base64')

    // Compare our hash to Shopify's hash
    if (hash === hmac) {
      // It's a match! All good
      console.log('Phew, it came from Shopifify!')
      res.sendStatus(200)
    } else  {
      // No match! This request didn't originate from Shopify
      console.log('Danger! Not from Shopify!')
      res.sendStatus(403)
            }
    })


## Project Setup

1) Login into Shopify and goto Apps > Manage Apps and create a private app.
![Step 1](/images/readme/1.png)

---

2) Give the app a name and email address. Select what data elements you would like you give access to.
![Step 2](/images/readme/2.png)

---

3) Copy the API Key and password to the basic authentication section in Postman. Ensure you have at least read access to the data elements you wish to access.
![Step 3](/images/readme/3.png)

---

4) Setup basic authentication and copy example URL endpoint from Shopify to save time.
![Step 4](/images/readme/4.png)


---
**Note:** When validating that the response is from Shopify, I discovered that I could no longer parse the response as JSON because the body was now in a raw format. Thus I had to change the express middleware command from:

    app.use('/webhooks', bodyParser.raw({ type: 'application/json' }));
    app.use(bodyParser.json());

to

    app.use('/webhooks', bodyParser.json({
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }))

and also change in the *isFromShopify()* method

    .update(req.body, 'utf8', 'hex')

to

    .update(req.rawBody, 'utf8', 'hex')




**Note:** Shopify uses "number" types for IDs and Google keys are alphanumeric, hence inline conversion is necessary. Thus you can't do this >

        await db.collection('customers').doc(customerID).set(data);

you must do this instead

        await db.collection('customers').doc(String(customerID)).set(data);

---
**References**

https://medium.com/@scottdixon/verifying-shopify-webhooks-with-nodejs-express-ac7845c9e40a

https://flaviocopes.com/express-get-raw-body/
