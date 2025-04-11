"use client";

import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { HiOutlinePlusCircle, HiOutlinePlusSmall } from "react-icons/hi2";
import { createPurchaseOrder } from "../services/poService";
import { getSupplier } from "../services/supplierService";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "@/src/context/AuthContext";
import Link from "next/link";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { PuffLoader } from "react-spinners";
import { getLastPONumber } from "../services/poService";
import { LuPlus, LuTrash2 } from "react-icons/lu";

const POForm = () => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(null);
  const [currencyType, setCurrencyType] = useState("LKR");
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [remark, setRemark] = useState("");
  const [isPoNumberLoading, setIsPoNumberLoading] = useState(true);
  const [poNumber, setPoNumber] = useState("");
  const [amount, setAmount] = useState("");

  const [items, setItems] = useState([
    { description: "", quantity: 1, unitPrice: 0, totalPrice: 0 },
  ]);

  const [calculations, setCalculations] = useState({
    subtotal: 0,
    discountType: "percentage",
    discountValue: 0,
    vatType: "percentage",
    vatValue: 0,
    taxType: "percentage",
    taxValue: 0,
    total: 0,
  });

  const [formData, setFormData] = useState({
    poNumber: "",
    description: "",
    transactionType: "",
    attendee: "",
    terms: {
      payment: "",
      warranty: "",
      amc: "",
      delivery: "",
      installation: "",
      validity: "",
    },
  });

  const handleTermChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      terms: {
        ...prev.terms,
        [field]: value,
      },
    }));
  };

  const { user } = useAuth();

  const fetchSuppliers = async () => {
    try {
      const response = await getSupplier();
      setSuppliers(response.data || response);
    } catch (error) {
      toast.error("Error fetching suppliers");
      console.error("Error fetching suppliers", error);
    }
  };

  const fetchPONumber = async () => {
    try {
      setIsPoNumberLoading(true);
      const newPoNumber = await getLastPONumber();
      if (newPoNumber) {
        setPoNumber(newPoNumber);
        setFormData((prev) => ({
          ...prev,
          poNumber: newPoNumber,
        }));
      } else {
        toast.error("Failed to generate PO number");
      }
    } catch (error) {
      console.error("Error fetching PO number:", error);
      toast.error("Failed to generate PO number");
    } finally {
      setIsPoNumberLoading(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        const [suppliersResponse, poNumber] = await Promise.all([
          fetchSuppliers(),
          fetchPONumber(),
        ]);

        // Set the PO number in formData
        if (poNumber) {
          setFormData((prev) => ({
            ...prev,
            poNumber: poNumber,
          }));
        }
      } catch (error) {
        console.error("Error initializing data", error);
        toast.error("Failed to load initial data.");
      }
    };

    initializeData();
  }, []);

  const validateForm = () => {
    if (!selectedSupplier) {
      toast.error("Please select a supplier");
      return false;
    }
    if (!formData.transactionType) {
      toast.error("Please select a transaction type");
      return false;
    }
    if (!formData.attendee) {
      toast.error("Please enter attendee");
      return false;
    }
    if (!invoiceDate) {
      toast.error("Please select a date");
      return false;
    }
    if (items.length === 0) {
      toast.error("Please add at least one item");
      return false;
    }
    if (
      items.some(
        (item) => !item.description || !item.quantity || !item.unitPrice
      )
    ) {
      toast.error("Please fill in all item details");
      return false;
    }
    if (calculations.total === 0) {
      toast.error("Total amount cannot be zero");
      return false;
    }
    return true;
  };

  const formatAmount = (value) => {
    if (!value) return "";
    const numericValue = value.toString().replace(/[^\d.]/g, "");
    const parts = numericValue.split(".");
    if (parts.length > 2) return value;
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const decimalPart = parts.length > 1 ? "." + parts[1] : "";
    return `${integerPart}${decimalPart}`;
  };

  const addItem = () => {
    setItems([
      ...items,
      { description: "", quantity: 1, unitPrice: 0, totalPrice: 0 },
    ]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    let newValue = value;
    if (field === "unitPrice") {
      const numericValue = value.toString().replace(/,/g, "");
      newValue = numericValue || 0;
      newItems[index] = {
        ...newItems[index],
        [field]: newValue,
        totalPrice: (newItems[index].quantity || 0) * parseFloat(newValue),
      };
    } else if (field === "quantity") {
      newValue = parseFloat(value) || 0;
      newItems[index] = {
        ...newItems[index],
        [field]: newValue,
        totalPrice: newValue * parseFloat(newItems[index].unitPrice || 0),
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        [field]: newValue,
      };
    }
    setItems(newItems);
    calculateTotals(newItems);
  };

  const handleFloatInput = (e, field) => {
    let value = e.target.value;

    // Only allow numbers and one decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setCalculations((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Convert to number for calculations
      const numericValue = value === "" ? 0 : parseFloat(value);
      setCalculations((prev) => ({
        ...prev,
        [field]: value, // Keep the string value for display
        [`${field}Number`]: numericValue, // Store numeric value for calculations
      }));

      // Use the numeric value for calculations
      calculateTotals(items, {
        ...calculations,
        [field]: numericValue,
      });
    }
  };

  const calculateTotals = (currentItems, overrideCalculations = null) => {
    const calcToUse = overrideCalculations || calculations;
    const subtotal = currentItems.reduce(
      (sum, item) => sum + (item.totalPrice || 0),
      0
    );

    const discountAmount =
      calcToUse.discountType === "percentage"
        ? (subtotal * parseFloat(calcToUse.discountValue || 0)) / 100
        : parseFloat(calcToUse.discountValue || 0);

    const vatAmount =
      calcToUse.vatType === "percentage"
        ? (subtotal * parseFloat(calcToUse.vatValue || 0)) / 100
        : parseFloat(calcToUse.vatValue || 0);

    const taxAmount =
      calcToUse.taxType === "percentage"
        ? (subtotal * parseFloat(calcToUse.taxValue || 0)) / 100
        : parseFloat(calcToUse.taxValue || 0);

    const total = subtotal - discountAmount + vatAmount + taxAmount;

    setCalculations((prev) => ({
      ...prev,
      subtotal,
      discountAmount,
      vatAmount,
      taxAmount,
      total,
    }));
  };

  const onFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    try {
      const poData = {
        PONumber: formData.poNumber,
        SID: parseInt(selectedSupplier),
        DID: parseInt(localStorage.getItem("DID")),
        Attendee: formData.attendee,
        Description: formData.description,
        QuotationDate: invoiceDate,
        Currency: currencyType,
        Status: 1,
        Total: calculations.total,
        isCreated: 1,
        isApproved: 0,
        isCancelled: 0,
        isPrinted: 0,
        Remark: remark,
        Type: formData.transactionType,
        DiscountPercentage:
          calculations.discountType === "percentage"
            ? parseFloat(calculations.discountValue)
            : 0,
        DiscountAmount:
          calculations.discountType === "fixed"
            ? parseFloat(calculations.discountValue)
            : 0,
        VATPercentage:
          calculations.vatType === "percentage"
            ? parseFloat(calculations.vatValue)
            : 0,
        VATAmount:
          calculations.vatType === "fixed"
            ? parseFloat(calculations.vatValue)
            : 0,
        TaxPercentage:
          calculations.taxType === "percentage"
            ? parseFloat(calculations.taxValue)
            : 0,
        TaxAmount:
          calculations.taxType === "fixed"
            ? parseFloat(calculations.taxValue)
            : 0,
        items: items.map((item, index) => ({
          Description: item.description,
          LineID: index + 1,
          Qty: parseFloat(item.quantity),
          UnitPrice: parseFloat(item.unitPrice),
          Total: parseFloat(item.totalPrice),
          PaymenTerms: formData.terms.payment,
          Warranty: formData.terms.warranty,
          AMCTerms: formData.terms.amc,
          DeliveryTerms: formData.terms.delivery,
          Installation: formData.terms.installation,
          Validity: formData.terms.validity,
        })),
      };

      console.log("Submitting PO data:", poData); // Debug log
      const result = await createPurchaseOrder(poData);
      if (result) {
        toast.success("Purchase Order created successfully");
        // Reset form
        setItems([
          { description: "", quantity: 1, unitPrice: 0, totalPrice: 0 },
        ]);
        setCalculations({
          subtotal: 0,
          discountType: "percentage",
          discountValue: 0,
          vatType: "percentage",
          vatValue: 0,
          taxType: "percentage",
          taxValue: 0,
          total: 0,
        });
        setSelectedSupplier("");
        setRemark("");
        setInvoiceDate(null);
        setFormData((prev) => ({
          ...prev,
          description: "",
          attendee: "",
          transactionType: "",
          terms: {
            payment: "",
            warranty: "",
            amc: "",
            delivery: "",
            installation: "",
            validity: "",
          },
        }));
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(error.message || "Failed to create purchase order");
    }
  };

  const handleNewButtonClick = () => {
    setIsFormVisible(true);
    setFormData({
      ...formData,
      poNumber: "",
      description: "",
      transactionType: "",
      attendee: "",
      terms: {
        payment: "",
        warranty: "",
        amc: "",
        delivery: "",
        installation: "",
        validity: "",
      },
    });
    fetchPONumber();
  };

  return (
    <div>
      <ToastContainer />
      <div className="flex md:flex-row flex-col justify-between items-center mb-4 p-4 border border-cyan-600 rounded-xl">
        <div>
          <h2 className="text-base text-center md:text-left font-semibold leading-7 text-gray-900">
            Purchase Order Manager
          </h2>
          <p className="mt-1 text-sm text-center md:text-left leading-6 text-gray-600">
            This form will be used to create new Purchase Orders.
          </p>
        </div>
        <div className="flex gap-3 items-center justify-center">
          <button
            onClick={handleNewButtonClick}
            className="flex gap-2 items-center justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 duration-300 ease-in-out"
          >
            New
            <HiOutlinePlusSmall className="text-xl font-bold" />
          </button>
        </div>
      </div>

      {isFormVisible && (
        <form onSubmit={onFormSubmit}>
          <div className="p-4 border border-cyan-600 rounded-xl">
            <div className="space-y-8">
              <div className="pb-8">
                <div className="mt-5 md:grid flex flex-col grid-cols-4 gap-x-6 gap-y-8 sm:grid-cols-6">
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900">
                      Supplier
                      <div>
                        <Link href={"/suppliers"}>
                          <HiOutlinePlusCircle
                            className="text-blue-500 text-lg cursor-pointer"
                            data-tooltip-id="supplier-tooltip"
                            data-tooltip-content="Add Supplier"
                          />
                        </Link>
                        <Tooltip
                          id="supplier-tooltip"
                          place="top"
                          effect="solid"
                        />
                      </div>
                    </label>
                    <div className="mt-2">
                      <select
                        value={selectedSupplier}
                        onChange={(e) => setSelectedSupplier(e.target.value)}
                        className="block w-full rounded-md border border-cyan-600 py-1.5 px-2 text-gray-900"
                      >
                        <option value="" disabled>
                          Select a supplier
                        </option>
                        {suppliers && suppliers.length > 0 ? (
                          suppliers.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.company}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>
                            No suppliers available
                          </option>
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-gray-900">
                      PO Number
                    </label>
                    <div className="mt-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.poNumber}
                          readOnly
                          disabled
                          placeholder="Loading..."
                          className="block w-full rounded-md border border-cyan-600 py-1.5 px-2 text-gray-900"
                        />
                        {isPoNumberLoading && (
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                            <PuffLoader size={20} color="#6366f1" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-gray-900">
                      Quotation Date
                    </label>
                    <div className="mt-2 w-full">
                      <DatePicker
                        selected={invoiceDate}
                        onChange={(date) => setInvoiceDate(date)}
                        className="block w-full rounded-md border border-cyan-600 py-1.5 px-2 text-gray-900"
                        dateFormat="yyyy-MM-dd"
                        maxDate={new Date()}
                        placeholderText="Select Quotation Date"
                        isClearable
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="scroll"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-gray-900">
                      Amount
                    </label>
                    <div className="mt-2">
                      <input
                        type="text"
                        disabled
                        value={formatAmount(calculations.total)}
                        onChange={(e) => {
                          const value = e.target.value.replace(/,/g, "");
                          if (!isNaN(value) || value === "" || value === ".") {
                            setAmount(value);
                          }
                        }}
                        onBlur={(e) => {
                          const rawValue = e.target.value.replace(/,/g, "");
                          if (rawValue) {
                            const numericValue = parseFloat(rawValue) || 0;
                            setAmount(numericValue.toFixed(2));
                          }
                        }}
                        className="block w-full rounded-md border border-cyan-600 py-1.5 px-2 text-gray-900 text-right"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-gray-900">
                      Currency
                    </label>
                    <div className="mt-2">
                      <select
                        required
                        value={currencyType}
                        onChange={(e) => setCurrencyType(e.target.value)}
                        className="block w-full rounded-md border border-cyan-600 py-1.5 px-2 text-gray-900"
                      >
                        <option value="" disabled>
                          Select Currency
                        </option>
                        <option value="LKR">LKR</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-gray-900">
                      Transaction Type
                    </label>
                    <div className="mt-2">
                      <select
                        required
                        value={formData.transactionType}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            transactionType: e.target.value,
                          }))
                        }
                        className="block w-full rounded-md border border-cyan-600 py-1.5 px-2 text-gray-900"
                      >
                        <option value="" disabled>
                          Select Transaction Type
                        </option>
                        <option value="Repair">Repair</option>
                        <option value="Service">Service</option>
                        <option value="Capital">Capital Expenditure</option>
                      </select>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-gray-900">
                      Description
                    </label>
                    <div className="mt-2">
                      <textarea
                        value={formData.description || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        rows={3}
                        className="block w-full rounded-md border border-cyan-600 py-1.5 px-2 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-gray-900">
                      Attendee
                    </label>
                    <div className="mt-2">
                      <input
                        type="text"
                        value={formData.attendee}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            attendee: e.target.value,
                          }))
                        }
                        className="block w-full rounded-md border border-cyan-600 py-1.5 px-2 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium leading-6 text-gray-900">
                      Remarks
                    </label>
                    <div className="mt-2">
                      <textarea
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        rows={3}
                        className="block w-full rounded-md border border-cyan-600 py-1.5 px-2 text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-900/10 pt-8">
              <h2 className="text-base font-semibold leading-7 text-gray-900">
                Items
              </h2>
              <div className="mt-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Quantity
                      </th>
                      <th className="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Unit Price
                      </th>
                      <th className="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                      <th className="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-2 ">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              updateItem(index, "description", e.target.value)
                            }
                            className="w-full border border-gray-300 rounded-md p-2"
                            placeholder="Enter Description Here"
                          />
                        </td>
                        <td className="px-1 py-2 justify-center text-center">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, "quantity", e.target.value)
                            }
                            className="w-16 border border-gray-300 rounded-md p-2 text-right"
                            min="1"
                          />
                        </td>
                        <td className="px-1 py-2  justify-center text-center">
                          <input
                            type="text"
                            value={formatAmount(item.unitPrice)}
                            onChange={(e) =>
                              updateItem(index, "unitPrice", e.target.value)
                            }
                            className="w-32 border border-gray-300 rounded-md p-2 text-right"
                          />
                        </td>
                        <td className="px-1 py-2 justify-center text-center ">
                          <input
                            type="text"
                            disabled
                            className="w-32 border border-gray-300 rounded-md p-2 text-right"
                            value={formatAmount(item.totalPrice)}
                          />
                        </td>
                        <td className="px-1 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = items.filter(
                                (_, i) => i !== index
                              );
                              setItems(newItems);
                              calculateTotals(newItems);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <LuTrash2 className="text-lg" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-4 ml-3 border border-blue-500 px-2 py-1  hover:bg-blue-700 hover:text-white duration-300 ease-in-out rounded-lg text-blue-600 flex items-center justify-center gap-2"
                >
                  <HiOutlinePlusCircle
                    className="text-lg cursor-pointer"
                    data-tooltip-id="item-tooltip"
                    data-tooltip-content="Add Item"
                  />
                  <span>New</span>
                  <Tooltip id="item-tooltip" place="right" effect="solid" />
                </button>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-900/10 pt-8">
              <div className="mt-4 flex flex-col gap-4 p-4 border rounded-md bg-gray-50">
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="text-right pb-4">Subtotal:</td>
                      <td className="text-right pb-4 pl-4 w-48">
                        {formatAmount(calculations.subtotal)}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-right pb-4">
                        <div className="flex items-center justify-end gap-2">
                          <span>Discount:</span>
                          <select
                            value={calculations.discountType}
                            onChange={(e) =>
                              setCalculations({
                                ...calculations,
                                discountType: e.target.value,
                              })
                            }
                            className="w-24 border rounded-md px-2 py-1"
                          >
                            <option value="percentage">%</option>
                            <option value="fixed">Fixed</option>
                          </select>
                          <input
                            type="text"
                            value={calculations.discountValue}
                            onChange={(e) =>
                              handleFloatInput(e, "discountValue")
                            }
                            className="w-28 border rounded-md px-2 py-1 text-right"
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                      <td className="text-right pb-4 pl-4 w-48 text-red-600">
                        -{formatAmount(calculations.discountAmount || 0)}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-right pb-4">
                        <div className="flex items-center justify-end gap-2">
                          <span>VAT:</span>
                          <select
                            value={calculations.vatType}
                            onChange={(e) =>
                              setCalculations({
                                ...calculations,
                                vatType: e.target.value,
                              })
                            }
                            className="w-24 border rounded-md px-2 py-1"
                          >
                            <option value="percentage">%</option>
                            <option value="fixed">Fixed</option>
                          </select>
                          <input
                            type="text"
                            value={calculations.vatValue}
                            onChange={(e) => handleFloatInput(e, "vatValue")}
                            className="w-28 border rounded-md px-2 py-1 text-right"
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                      <td className="text-right pb-4 pl-4 w-48">
                        {formatAmount(calculations.vatAmount || 0)}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-right pb-4">
                        <div className="flex items-center justify-end gap-2">
                          <span>Tax:</span>
                          <select
                            value={calculations.taxType}
                            onChange={(e) =>
                              setCalculations({
                                ...calculations,
                                taxType: e.target.value,
                              })
                            }
                            className="w-24 border rounded-md px-2 py-1"
                          >
                            <option value="percentage">%</option>
                            <option value="fixed">Fixed</option>
                          </select>
                          <input
                            type="text"
                            value={calculations.taxValue}
                            onChange={(e) => handleFloatInput(e, "taxValue")}
                            className="w-28 border rounded-md px-2 py-1 text-right"
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                      <td className="text-right pb-4 pl-4 w-48">
                        {formatAmount(calculations.taxAmount || 0)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="text-right pt-4 font-semibold">Total:</td>
                      <td className="text-right pt-4 pl-4 w-48 font-semibold text-lg">
                        {formatAmount(calculations.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-900/10 pt-8">
              <h2 className="text-base font-semibold leading-7 text-gray-900">
                Terms and Conditions
              </h2>

              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={formData.terms.payment}
                    onChange={(e) =>
                      handleTermChange("payment", e.target.value)
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 py-1.5 px-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Warranty Terms
                  </label>
                  <input
                    type="text"
                    value={formData.terms.warranty}
                    onChange={(e) =>
                      handleTermChange("warranty", e.target.value)
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 py-1.5 px-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    AMC Terms
                  </label>
                  <input
                    type="text"
                    value={formData.terms.amc}
                    onChange={(e) => handleTermChange("amc", e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-1.5 px-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Delivery Terms
                  </label>
                  <input
                    type="text"
                    value={formData.terms.delivery}
                    onChange={(e) =>
                      handleTermChange("delivery", e.target.value)
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 py-1.5 px-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Installation Terms
                  </label>
                  <input
                    type="text"
                    value={formData.terms.installation}
                    onChange={(e) =>
                      handleTermChange("installation", e.target.value)
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 py-1.5 px-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Validity
                  </label>
                  <input
                    type="text"
                    value={formData.terms.validity}
                    onChange={(e) =>
                      handleTermChange("validity", e.target.value)
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 py-1.5 px-2"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-x-6">
              <button
                type="button"
                className="text-sm font-semibold leading-6 text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default POForm;
