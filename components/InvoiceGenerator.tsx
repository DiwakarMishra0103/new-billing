import React, { useState, useEffect, useRef } from 'react';
import { Client, AgencyProfile } from '../types';
import { formatCurrency } from '../constants';
import { 
  ArrowLeft, Printer, Share2, MessageCircle, Hexagon, 
  Settings, Upload, Image as ImageIcon, LayoutTemplate, 
  Check, Mail, Code, FileCode, RotateCcw, Info, CheckCircle2,
  Plus, Trash2, FileText
} from 'lucide-react';
import { generateClientMessage } from '../services/geminiService';

interface InvoiceGeneratorProps {
  client: Client;
  agencyProfile: AgencyProfile;
  setAgencyProfile: (profile: AgencyProfile) => void;
  onBack: () => void;
}

type TemplateType = 'MODERN' | 'CLASSIC' | 'MINIMAL' | 'TAX' | 'CUSTOM';

interface InvoiceItem {
  id: string;
  description: string;
  rate: number;
  quantity: number;
  hsn: string;
}

const DEFAULT_CUSTOM_TEMPLATE = `
<style>
  .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; color: #555; }
  .invoice-box table { width: 100%; line-height: inherit; text-align: left; }
  .invoice-box table td { padding: 5px; vertical-align: top; }
  .invoice-box table tr td:nth-child(3) { text-align: right; }
  .top-header { background: #333; color: #fff; padding: 20px; margin-bottom: 20px; }
  .heading td { background: #eee; border-bottom: 1px solid #ddd; font-weight: bold; }
  .item td { border-bottom: 1px solid #eee; }
  .total td { border-top: 2px solid #eee; font-weight: bold; }
</style>

<div class="invoice-box">
  <div class="top-header">
     <h1 style="margin:0">{{agency_name}}</h1>
     <p style="margin:0; font-size: 14px; opacity: 0.8">{{agency_email}}</p>
     <p style="margin:0; font-size: 14px; opacity: 0.8">{{agency_website}}</p>
  </div>
  
  <table cellpadding="0" cellspacing="0">
    <tr>
       <td colspan="3">
          <strong>Invoice #:</strong> {{invoice_number}}<br>
          <strong>Date:</strong> {{date}}
       </td>
    </tr>
    <tr>
       <td colspan="2" style="padding-top: 20px; padding-bottom: 20px;">
          <strong>Bill To:</strong><br>
          {{client_business}}<br>
          {{client_name}}<br>
          {{client_address}}<br>
          Phone: {{client_phone}}<br>
          GST: {{client_gst}}
       </td>
       <td style="padding-top: 20px; padding-bottom: 20px; text-align: right;">
          <strong>Pay To:</strong><br>
          {{agency_name}}<br>
          {{agency_address}}<br>
          Phone: {{agency_phone}}<br>
          GST: {{agency_gst}}
       </td>
    </tr>
  </table>

  <table cellpadding="0" cellspacing="0">
    <tr class="heading">
       <td>Item</td>
       <td>HSN/SAC</td>
       <td>Price</td>
    </tr>
    
    <!-- Services Rows will be injected here -->
    {{services_table_rows}}
    
    <tr class="total">
       <td></td>
       <td></td>
       <td style="padding-top: 20px;">
          Subtotal: {{subtotal}}<br>
          GST (18%): {{gst_amount}}<br>
          Total: {{total_amount}}
       </td>
    </tr>
    <tr>
       <td></td>
       <td></td>
       <td style="color: green;">Paid: {{paid_amount}}</td>
    </tr>
    <tr>
       <td></td>
       <td></td>
       <td style="color: red; font-weight: bold;">Due: {{due_amount}}</td>
    </tr>
  </table>
  
  <p style="margin-top: 40px; font-size: 12px; text-align: center;">Thank you for your business!</p>
</div>
`;

// Helper: Number to Words (Indian System)
const numberToWords = (num: number): string => {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    if ((n = n.toString() as any).length > 9) return 'overflow';
    const n_array: any = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_array) return '';
    let str = '';
    str += (n_array[1] != 0) ? (a[Number(n_array[1])] || b[n_array[1][0]] + ' ' + a[n_array[1][1]]) + 'Crore ' : '';
    str += (n_array[2] != 0) ? (a[Number(n_array[2])] || b[n_array[2][0]] + ' ' + a[n_array[2][1]]) + 'Lakh ' : '';
    str += (n_array[3] != 0) ? (a[Number(n_array[3])] || b[n_array[3][0]] + ' ' + a[n_array[3][1]]) + 'Thousand ' : '';
    str += (n_array[4] != 0) ? (a[Number(n_array[4])] || b[n_array[4][0]] + ' ' + a[n_array[4][1]]) + 'Hundred ' : '';
    str += (n_array[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n_array[5])] || b[n_array[5][0]] + ' ' + a[n_array[5][1]]) : '';
    return str;
  }
  
  const whole = Math.floor(num);
  return "INR " + inWords(whole) + "Only";
};

const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ client, agencyProfile, setAgencyProfile, onBack }) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  // Editable Invoice Date
  const [invoiceDate, setInvoiceDate] = useState(new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  }));

  const [isEditing, setIsEditing] = useState(false);
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<TemplateType>('MODERN');
  
  // Custom Template State
  const [customCode, setCustomCode] = useState(agencyProfile.customInvoiceTemplate || DEFAULT_CUSTOM_TEMPLATE);
  
  // Temp state for editing profile
  const [editForm, setEditForm] = useState<AgencyProfile>(agencyProfile);

  // Line Items State
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Tax Invoice specific fields state
  const [taxFields, setTaxFields] = useState({
    deliveryNote: '',
    modeOfPayment: 'Immediate',
    referenceNo: '',
    otherReferences: '',
    buyersOrderNo: '',
    buyersOrderDate: '',
    dispatchDocNo: '',
    deliveryNoteDate: '',
    dispatchedThrough: '',
    destination: '',
    termsOfDelivery: '',
    // Agency Overrides
    agencyState: 'Karnataka',
    agencyStateCode: '29',
    // Consignee
    consigneeName: '',
    consigneeAddress: '',
    consigneeGST: '',
    consigneeState: '', 
    consigneeCode: '',
    // Buyer
    buyerName: '',
    buyerAddress: '',
    buyerGST: '',
    buyerState: '',
    buyerCode: '',
    // Additional Text
    subDescription: 'Digital Marketing Services'
  });

  const initialized = useRef(false);

  // Initialize Invoice Items from Client Data
  useEffect(() => {
    if (items.length === 0) {
        const safeServices = client.services || [];
        const count = safeServices.length > 0 ? safeServices.length : 1;
        const ratePerService = client.dealAmount / count;

        const initialItems = safeServices.length > 0 
            ? safeServices.map((s, i) => ({ 
                id: i.toString(), 
                description: s, 
                rate: parseFloat(ratePerService.toFixed(2)), 
                quantity: 1,
                hsn: '998361' 
              }))
            : [{ 
                id: '0', 
                description: 'Professional Services', 
                rate: client.dealAmount, 
                quantity: 1,
                hsn: '998361' 
              }];
        
        setItems(initialItems);
    }
  }, [client]);

  // Initialize Tax Fields with client data
  useEffect(() => {
     const stateName = client.gstIn ? 'Maharashtra' : '';
     const stateCode = client.gstIn ? client.gstIn.substring(0,2) : '';
     
     setTaxFields(prev => ({
        ...prev,
        consigneeName: client.businessName,
        consigneeAddress: client.address || '',
        consigneeGST: client.gstIn || '',
        consigneeState: stateName,
        consigneeCode: stateCode,
        buyerName: client.businessName,
        buyerAddress: client.address || '',
        buyerGST: client.gstIn || '',
        buyerState: stateName,
        buyerCode: stateCode,
     }));
  }, [client]);

  // Generate unique sequential invoice number on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const currentYear = new Date().getFullYear();
    const storageKey = 'agency_invoice_seq';
    const storedSeq = localStorage.getItem(storageKey);
    
    // Start from 1000 if no history
    let seq = storedSeq ? parseInt(storedSeq, 10) : 1000;
    seq += 1;
    
    localStorage.setItem(storageKey, seq.toString());
    
    // Generate Client Short Code
    const clientCode = client.businessName
      ? client.businessName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase()
      : 'GEN';

    setInvoiceNumber(`INV-${currentYear}-${clientCode}-${seq}`);
  }, [client.businessName]);
  
  // Dynamic Calculations based on Items
  const totalAmount = items.reduce((sum, item) => sum + (item.rate * item.quantity), 0);
  const paid = (client.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const due = totalAmount - paid;
  
  // GST Calculations (18%)
  const gstRate = 18;
  const taxableValue = totalAmount / (1 + gstRate / 100);
  const gstAmount = totalAmount - taxableValue;
  const cgstAmount = gstAmount / 2;
  const sgstAmount = gstAmount / 2;

  // --- Handlers ---

  const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
      const newItems = [...items];
      // @ts-ignore
      newItems[index] = { ...newItems[index], [field]: value };
      setItems(newItems);
  };

  const handleUpdateTaxField = (field: keyof typeof taxFields, value: string) => {
    setTaxFields(prev => ({ ...prev, [field]: value }));
  };

  const handleAddItem = () => {
      setItems([...items, { id: Date.now().toString(), description: 'New Service Item', rate: 0, quantity: 1, hsn: '998361' }]);
  };

  const handleRemoveItem = (index: number) => {
      if (items.length > 1) {
          setItems(items.filter((_, i) => i !== index));
      }
  };

  const handleEmailShare = async () => {
    const msg = await generateClientMessage(client, 'INVOICE_EMAIL', due);
    window.location.href = `mailto:${client.email}?subject=Invoice ${invoiceNumber} from ${agencyProfile.name}&body=${encodeURIComponent(msg)}`;
  };

  const handleWhatsAppShare = () => {
      const msg = `Hello ${client.name},\n\nHere is your invoice ${invoiceNumber} from ${agencyProfile.name}.\n\nTotal Amount: ${formatCurrency(totalAmount)}\nPaid: ${formatCurrency(paid)}\nDue Amount: ${formatCurrency(due)}\n\nPlease clear the dues at the earliest.\n\nThank you for your business!`;
      const url = `https://wa.me/${client.phone}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm({ ...editForm, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = () => {
    setAgencyProfile(editForm);
    setIsEditing(false);
  };

  const saveCustomTemplate = () => {
    const updatedProfile = { ...agencyProfile, customInvoiceTemplate: customCode };
    setAgencyProfile(updatedProfile);
    setIsEditingCustom(false);
  };

  // --- PRINT FUNCTIONALITY (Isolated Popup with Text Replacement) ---
  const handlePrint = () => {
    const content = invoiceRef.current;
    if (!content) return;

    // 1. Clone the node to avoid messing with the current UI
    const clone = content.cloneNode(true) as HTMLElement;

    // 2. Identify original and cloned inputs
    // We need to reference the original inputs to get the current values and computed styles
    const originalInputs = content.querySelectorAll('input, textarea');
    const clonedInputs = clone.querySelectorAll('input, textarea');

    // 3. Replace all cloned inputs/textareas with styled Text Divs
    // This ensures they print as normal text without borders, scrollbars, or form styling
    originalInputs.forEach((original, index) => {
        const cloned = clonedInputs[index];
        const val = (original as HTMLInputElement | HTMLTextAreaElement).value;
        const computed = window.getComputedStyle(original);

        // Create a text container
        const textNode = document.createElement('div');
        textNode.textContent = val;
        
        // Copy critical typography styles to match the editor look
        textNode.style.fontFamily = computed.fontFamily;
        textNode.style.fontWeight = computed.fontWeight;
        textNode.style.fontSize = computed.fontSize;
        textNode.style.textAlign = computed.textAlign;
        textNode.style.color = computed.color;
        
        // Layout styles
        textNode.style.width = '100%';
        textNode.style.whiteSpace = 'pre-wrap'; // Preserve line breaks for textareas
        textNode.style.wordBreak = 'break-word';
        textNode.style.display = 'block';
        textNode.style.lineHeight = computed.lineHeight;

        // Replace the input in the clone
        if (cloned.parentNode) {
            cloned.parentNode.replaceChild(textNode, cloned);
        }
    });

    // 4. Remove UI-only elements from the clone (Buttons, Placeholders)
    const uiElements = clone.querySelectorAll('button, .no-print');
    uiElements.forEach(el => el.remove());

    // 5. Open a new window for printing
    const printWindow = window.open('', '_blank', 'height=900,width=1000');
    if (!printWindow) {
        alert("Please allow popups to print the invoice.");
        return;
    }

    // 6. Construct the print document with print-specific CSS
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice - ${invoiceNumber}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                
                body { 
                    font-family: 'Inter', sans-serif;
                    background: white; 
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact; 
                    margin: 0;
                    padding: 0;
                }
                
                /* Standard A4 Settings */
                @page {
                    size: A4;
                    margin: 10mm; 
                }

                /* Layout Resets for Print */
                .invoice-container {
                    width: 100% !important;
                    max-width: none !important;
                    box-shadow: none !important;
                    border: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                }

                /* Ensure tables don't break awkwardly */
                table { width: 100% !important; table-layout: fixed; }
                tr { page-break-inside: avoid; }
                
                /* Color corrections for print (ensure contrast) */
                h1, h2, h3, h4, h5, h6 { color: #111827 !important; }
                .text-slate-500, .text-slate-400 { color: #64748b !important; }
                .text-slate-900 { color: #0f172a !important; }

                /* Specific Template Tweaks */
                .bg-slate-50 { background-color: #f8fafc !important; }
                .bg-slate-100 { background-color: #f1f5f9 !important; }
                .bg-slate-900 { background-color: #0f172a !important; color: white !important; }
                
                /* Tax Invoice Grid Lines */
                .border-black { border-color: #000 !important; }
            </style>
        </head>
        <body>
            ${clone.outerHTML}
            <script>
                window.onload = function() {
                    // Small delay to ensure Tailwind computes styles before printing
                    setTimeout(function() {
                        window.print();
                        window.close();
                    }, 500); 
                };
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
  };

  const inputClass = "w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow shadow-sm placeholder-slate-400";
  
  // Style for editable inputs in invoice
  const editableInputClass = "bg-white text-slate-900 border border-slate-200 shadow-sm hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none w-full transition-all rounded px-2 py-1 print:border-none print:bg-transparent print:p-0 print:shadow-none print:resize-none";

  // --- Process Custom Template ---
  const processCustomTemplate = () => {
    let template = customCode;

    // Helper for safe replacements
    const replace = (key: string, value: string | number | undefined) => {
       const regex = new RegExp(`{{${key}}}`, 'g');
       template = template.replace(regex, String(value || ''));
    };

    // Replace Variables
    replace('agency_name', agencyProfile.name);
    replace('agency_address', agencyProfile.address);
    replace('agency_phone', agencyProfile.phone);
    replace('agency_email', agencyProfile.email);
    replace('agency_website', agencyProfile.website);
    replace('agency_gst', agencyProfile.gstIn);
    
    replace('client_name', client.name);
    replace('client_business', client.businessName);
    replace('client_address', client.address);
    replace('client_phone', client.phone);
    replace('client_gst', client.gstIn);
    
    replace('invoice_number', invoiceNumber);
    replace('date', invoiceDate);
    replace('total_amount', formatCurrency(totalAmount));
    replace('paid_amount', formatCurrency(paid));
    replace('due_amount', formatCurrency(due));
    replace('subtotal', formatCurrency(taxableValue));
    replace('gst_amount', formatCurrency(gstAmount));

    // Special: Logo
    if (agencyProfile.logoUrl) {
       template = template.replace('{{logo_url}}', agencyProfile.logoUrl);
    }

    // Special: Services Table Rows
    let rowsHtml = '';
    items.forEach(item => {
         rowsHtml += `<tr class="item"><td>${item.description}</td><td>${item.hsn}</td><td>${formatCurrency(item.rate * item.quantity)}</td></tr>`;
    });
    template = template.replace('{{services_table_rows}}', rowsHtml);

    return { __html: template };
  };

  // --- Templates ---

  const ModernTemplate = () => (
    <div className="bg-white p-8 md:p-12 lg:p-16 h-full text-slate-900 flex flex-col min-h-[800px] invoice-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-6">
          <div className="flex items-start gap-5">
            {agencyProfile.logoUrl ? (
              <img src={agencyProfile.logoUrl} alt="Logo" className="h-20 w-auto object-contain max-w-[180px]" />
            ) : (
              <div className="bg-slate-900 p-4 rounded-xl print:bg-slate-900">
                <Hexagon className="h-8 w-8 text-white" />
              </div>
            )}
            <div>
                <h2 className="text-2xl font-bold text-slate-900 leading-tight">{agencyProfile.name}</h2>
                <p className="text-sm text-slate-500 font-medium">Digital Growth Partners</p>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-block bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 print:bg-slate-50 print:border-slate-100">
               <h1 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Invoice No.</h1>
               <input 
                  type="text" 
                  value={invoiceNumber} 
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className={`${editableInputClass} text-xl font-mono font-semibold text-slate-900 text-right w-full`}
               />
            </div>
            <div className="flex items-center justify-end gap-2 mt-2">
               <span className="text-sm text-slate-500 font-medium">Issued:</span>
               <input 
                  type="text" 
                  value={invoiceDate} 
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className={`${editableInputClass} text-sm text-slate-500 font-medium w-24 text-right`}
               />
            </div>
          </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 mb-12 pb-12 border-b border-slate-100">
          <div className="lg:col-span-5 space-y-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">From</h3>
            <p className="font-bold text-slate-900 text-lg">{agencyProfile.name}</p>
            <p className="text-slate-600 whitespace-pre-line text-sm leading-relaxed">{agencyProfile.address}</p>
            <div className="pt-2 text-sm text-slate-600">
               <p>GSTIN: <span className="font-mono text-slate-900">{agencyProfile.gstIn}</span></p>
               <p>{agencyProfile.email}</p>
               <p>{agencyProfile.phone}</p>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Bill To</h3>
            <p className="font-bold text-slate-900 text-lg">{client.businessName}</p>
            <p className="text-slate-700 font-medium">{client.name}</p>
            <p className="text-slate-600 whitespace-pre-wrap max-w-xs text-sm leading-relaxed">{client.address || 'Address not provided'}</p>
            {client.gstIn && <p className="pt-2 text-sm text-slate-600">GSTIN: <span className="font-mono text-slate-900">{client.gstIn}</span></p>}
            <p className="text-sm text-slate-600">{client.phone}</p>
          </div>

          <div className="lg:col-span-3 flex flex-col justify-end items-start lg:items-end">
             <div className="bg-indigo-50 p-6 rounded-2xl w-full text-center lg:text-right border border-indigo-100 print:bg-indigo-50">
                <p className="text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1 print:text-indigo-700">Amount Due</p>
                <p className="text-3xl font-bold text-indigo-700 print:text-indigo-900">{formatCurrency(due)}</p>
             </div>
          </div>
      </div>

      {/* Items Table */}
      <div className="flex-1 mb-12 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3 pl-2">Description</th>
                  <th className="py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-24">HSN/SAC</th>
                  <th className="py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Rate</th>
                  <th className="py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Qty</th>
                  <th className="py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider pr-2">Amount</th>
                  <th className="py-4 w-8 no-print"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={item.id} className="group">
                      <td className="py-5 pl-2">
                        <input 
                          type="text" 
                          value={item.description}
                          onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                          className={`${editableInputClass} font-bold text-slate-800 text-sm`}
                        />
                        <p className="text-xs text-slate-400 mt-1 print:text-slate-600 pl-1">Professional Services</p>
                      </td>
                      <td className="py-5 text-right text-slate-600 text-sm font-medium">
                        <input 
                          type="text" 
                          value={item.hsn}
                          onChange={(e) => handleUpdateItem(idx, 'hsn', e.target.value)}
                          className={`${editableInputClass} text-right w-full`}
                          placeholder="HSN"
                        />
                      </td>
                      <td className="py-5 text-right text-slate-600 text-sm font-medium">
                        <input 
                          type="number" 
                          value={item.rate}
                          onChange={(e) => handleUpdateItem(idx, 'rate', parseFloat(e.target.value))}
                          className={`${editableInputClass} text-right`}
                        />
                      </td>
                      <td className="py-5 text-right text-slate-600 text-sm font-medium">
                        <input 
                          type="number" 
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value))}
                          className={`${editableInputClass} text-right w-12`}
                        />
                      </td>
                      <td className="py-5 text-right text-slate-800 font-bold text-sm pr-2">
                        {formatCurrency(item.rate * item.quantity)}
                      </td>
                      <td className="py-5 text-center no-print">
                        <button 
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <button 
             onClick={handleAddItem}
             className="mt-4 flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors no-print"
          >
             <Plus className="h-4 w-4" /> Add Line Item
          </button>
      </div>

      {/* Footer / Calculations */}
      <div className="flex flex-col md:flex-row gap-12">
          <div className="flex-1 space-y-8">
             <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 print:bg-slate-50">
                <h4 className="font-bold text-slate-900 mb-4 text-xs uppercase tracking-wider">Bank Details</h4>
                <div className="grid grid-cols-2 gap-y-2 text-sm text-slate-600">
                   <span className="text-slate-400 print:text-slate-600">Bank</span> <span className="font-medium text-slate-900">HDFC Bank</span>
                   <span className="text-slate-400 print:text-slate-600">Account</span> <span className="font-medium text-slate-900 font-mono">1234567890</span>
                   <span className="text-slate-400 print:text-slate-600">IFSC</span> <span className="font-medium text-slate-900 font-mono">HDFC0001234</span>
                </div>
             </div>
             <div>
                <h4 className="font-bold text-slate-900 mb-2 text-xs uppercase tracking-wider">Terms</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm print:text-slate-700">Payment due within 7 days. Late payments subject to 5% monthly interest. Please include invoice number in transaction remarks.</p>
             </div>
          </div>

          <div className="w-full md:w-80 space-y-3">
            <div className="flex justify-between text-sm text-slate-500 print:text-slate-700">
                <span>Subtotal</span>
                <span className="font-medium text-slate-900">{formatCurrency(taxableValue)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500 print:text-slate-700">
                <span>GST (18%)</span>
                <span className="font-medium text-slate-900">{formatCurrency(gstAmount)}</span>
            </div>
            <div className="border-t border-slate-200 pt-3 mt-3 flex justify-between items-center">
                <span className="text-slate-900 font-bold">Total</span>
                <span className="text-slate-900 font-bold text-xl">{formatCurrency(totalAmount)}</span>
            </div>
            {paid > 0 && (
                <div className="flex justify-between text-sm text-emerald-600 pt-2 font-medium print:text-emerald-800">
                  <span>Amount Paid</span>
                  <span>- {formatCurrency(paid)}</span>
                </div>
            )}
            <div className="border-t border-slate-200 mt-4 pt-4">
              <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-500 print:text-slate-700">Balance Due</span>
                  <span className="text-2xl font-bold text-slate-900">{formatCurrency(due)}</span>
              </div>
            </div>
          </div>
      </div>
    </div>
  );

  const ClassicTemplate = () => (
    <div className="bg-white p-12 h-full font-serif text-slate-900 border-t-8 border-slate-800 invoice-container">
       <div className="text-center mb-12">
          <h1 className="text-4xl font-bold uppercase tracking-widest mb-3">{agencyProfile.name}</h1>
          <p className="text-slate-600 italic">{agencyProfile.address} | {agencyProfile.phone}</p>
       </div>

       <div className="flex flex-col sm:flex-row justify-between items-start mb-12 gap-8 pt-8 border-t border-slate-200">
          <div className="sm:w-1/2">
             <h3 className="font-bold uppercase text-xs tracking-widest text-slate-500 mb-4 print:text-slate-700">Bill To</h3>
             <p className="font-bold text-xl mb-1">{client.businessName}</p>
             <p className="text-lg mb-1">{client.name}</p>
             <p className="text-slate-600 whitespace-pre-line text-sm">{client.address}</p>
             {client.gstIn && <p className="pt-2 text-sm text-slate-600">GSTIN: <span className="font-mono text-slate-900">{client.gstIn}</span></p>}
          </div>
          <div className="sm:w-1/3 text-right">
             <div className="flex justify-between mb-2 border-b border-slate-100 pb-1">
               <span className="font-bold text-slate-500 text-sm uppercase print:text-slate-700">Invoice #</span>
               <input 
                  type="text" 
                  value={invoiceNumber} 
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className={`${editableInputClass} font-bold font-mono text-right w-32`}
               />
             </div>
             <div className="flex justify-between mb-6 border-b border-slate-100 pb-1">
               <span className="font-bold text-slate-500 text-sm uppercase print:text-slate-700">Date</span>
               <input 
                  type="text" 
                  value={invoiceDate} 
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className={`${editableInputClass} text-right w-24`}
               />
             </div>
             <div className="bg-slate-100 p-4 text-center print:bg-slate-100">
                <span className="block text-xs uppercase font-bold text-slate-500 mb-1 print:text-slate-700">Amount Due</span>
                <span className="block text-2xl font-bold">{formatCurrency(due)}</span>
             </div>
          </div>
       </div>

       <div className="overflow-x-auto">
         <table className="w-full border-collapse mb-12 min-w-[500px]">
            <thead>
               <tr className="border-b-2 border-slate-800">
                  <th className="py-3 text-left font-bold uppercase text-sm">Description</th>
                  <th className="py-3 text-right font-bold uppercase text-sm">HSN/SAC</th>
                  <th className="py-3 text-right font-bold uppercase text-sm">Rate</th>
                  <th className="py-3 text-right font-bold uppercase text-sm">Qty</th>
                  <th className="py-3 text-right font-bold uppercase text-sm">Amount</th>
                  <th className="py-3 w-8 no-print"></th>
               </tr>
            </thead>
            <tbody>
               {items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-slate-200 group">
                     <td className="py-4">
                        <input 
                          type="text" 
                          value={item.description}
                          onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                          className={`${editableInputClass} font-serif`}
                        />
                     </td>
                     <td className="py-4 text-right font-medium">
                        <input 
                          type="text" 
                          value={item.hsn}
                          onChange={(e) => handleUpdateItem(idx, 'hsn', e.target.value)}
                          className={`${editableInputClass} text-right w-24 font-serif`}
                          placeholder="HSN"
                        />
                     </td>
                     <td className="py-4 text-right font-medium">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-slate-400 text-xs">₹</span>
                          <input 
                            type="number" 
                            value={item.rate}
                            onChange={(e) => handleUpdateItem(idx, 'rate', parseFloat(e.target.value))}
                            className={`${editableInputClass} text-right w-24`}
                          />
                        </div>
                     </td>
                     <td className="py-4 text-right font-medium">
                        <input 
                          type="number" 
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value))}
                          className={`${editableInputClass} text-right w-16 font-serif`}
                        />
                     </td>
                     <td className="py-4 text-right font-medium">
                        {formatCurrency(item.rate * item.quantity)}
                     </td>
                     <td className="py-4 text-center no-print">
                        <button 
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                  </tr>
               ))}
            </tbody>
         </table>
         <button 
             onClick={handleAddItem}
             className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors no-print"
          >
             <Plus className="h-4 w-4" /> Add Item
          </button>
       </div>

       <div className="flex justify-end mt-8">
          <div className="w-full sm:w-1/2 space-y-3">
             <div className="flex justify-between"><span>Subtotal</span> <span>{formatCurrency(taxableValue)}</span></div>
             <div className="flex justify-between"><span>GST (18%)</span> <span>{formatCurrency(gstAmount)}</span></div>
             <div className="flex justify-between font-bold text-xl border-t-2 border-slate-800 pt-3 mt-3"><span>TOTAL</span> <span>{formatCurrency(totalAmount)}</span></div>
          </div>
       </div>

       <div className="mt-20 text-center text-sm border-t border-slate-200 pt-8">
          <p className="font-bold mb-1">Make all checks payable to {agencyProfile.name}</p>
          <p className="text-slate-500">Thank you for your business!</p>
       </div>
    </div>
  );

  const MinimalTemplate = () => (
    <div className="bg-white p-12 lg:p-16 h-full font-sans text-slate-900 invoice-container">
       <div className="flex flex-col sm:flex-row justify-between items-start mb-24 gap-12">
          <div>
            <h1 className="text-xl font-medium tracking-tight mb-8">{agencyProfile.name}</h1>
            <div className="text-xs font-bold uppercase tracking-widest mb-2 text-slate-400 print:text-slate-600">Billed To</div>
            <p className="font-semibold text-2xl mb-1">{client.businessName}</p>
            <p className="text-slate-500 print:text-slate-700">{client.name}</p>
            <p className="text-slate-500 print:text-slate-700 text-sm mt-1 whitespace-pre-line">{client.address}</p>
            {client.gstIn && <p className="text-slate-400 print:text-slate-600 text-xs mt-2 font-medium">GSTIN: {client.gstIn}</p>}
          </div>
          <div className="text-right">
             <h2 className="text-5xl font-light text-slate-200 mb-8 print:text-slate-400">INVOICE</h2>
             <input 
                type="text" 
                value={invoiceNumber} 
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className={`${editableInputClass} font-mono text-sm mb-1 text-right w-full`}
             />
             <input 
                type="text" 
                value={invoiceDate} 
                onChange={(e) => setInvoiceDate(e.target.value)}
                className={`${editableInputClass} text-sm text-slate-400 text-right w-full`}
             />
          </div>
       </div>

       <div className="overflow-x-auto">
         <table className="w-full mb-16 min-w-[500px]">
            <thead>
               <tr className="border-b border-black">
                  <th className="text-left py-4 text-xs font-bold uppercase tracking-wider">Item</th>
                  <th className="text-right py-4 text-xs font-bold uppercase tracking-wider">HSN/SAC</th>
                  <th className="text-right py-4 text-xs font-bold uppercase tracking-wider">Rate</th>
                  <th className="text-right py-4 text-xs font-bold uppercase tracking-wider">Qty</th>
                  <th className="text-right py-4 text-xs font-bold uppercase tracking-wider">Total</th>
                  <th className="py-4 w-8 no-print"></th>
               </tr>
            </thead>
            <tbody>
               {items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-slate-100 group">
                     <td className="py-6">
                        <input 
                          type="text" 
                          value={item.description}
                          onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                          className={`${editableInputClass} text-lg font-light`}
                        />
                     </td>
                     <td className="py-6 text-right">
                        <input 
                          type="text" 
                          value={item.hsn}
                          onChange={(e) => handleUpdateItem(idx, 'hsn', e.target.value)}
                          className={`${editableInputClass} text-lg font-light text-right w-24`}
                          placeholder="HSN"
                        />
                     </td>
                     <td className="py-6 text-right">
                        <input 
                          type="number" 
                          value={item.rate}
                          onChange={(e) => handleUpdateItem(idx, 'rate', parseFloat(e.target.value))}
                          className={`${editableInputClass} text-lg font-light text-right`}
                        />
                     </td>
                     <td className="py-6 text-right">
                        <input 
                          type="number" 
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value))}
                          className={`${editableInputClass} text-lg font-light text-right w-16`}
                        />
                     </td>
                     <td className="py-6 text-right text-lg font-light">
                        {formatCurrency(item.rate * item.quantity)}
                     </td>
                     <td className="py-6 text-center no-print">
                        <button 
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                  </tr>
               ))}
            </tbody>
         </table>
         <button 
             onClick={handleAddItem}
             className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors no-print -mt-8 mb-12"
          >
             <Plus className="h-4 w-4" /> Add Item
          </button>
       </div>

       <div className="flex justify-end mb-24">
          <div className="w-72 space-y-4">
             <div className="flex justify-between text-sm">
                <span className="text-slate-500 print:text-slate-600">Subtotal</span>
                <span>{formatCurrency(taxableValue)}</span>
             </div>
             <div className="flex justify-between text-sm">
                <span className="text-slate-500 print:text-slate-600">GST 18%</span>
                <span>{formatCurrency(gstAmount)}</span>
             </div>
             <div className="flex justify-between text-3xl font-light pt-4 border-t border-black">
                <span>Total</span>
                <span>{formatCurrency(totalAmount)}</span>
             </div>
             {due > 0 && (
                <div className="flex justify-between text-sm text-red-500 font-medium pt-2 print:text-red-700">
                   <span>Due Amount</span>
                   <span>{formatCurrency(due)}</span>
                </div>
             )}
          </div>
       </div>

       <div className="flex flex-col sm:flex-row justify-between items-end border-t border-slate-100 pt-8 text-xs text-slate-400 gap-4">
          <div>
             <p className="font-bold text-slate-900 uppercase tracking-wider mb-2">Pay To</p>
             <p>{agencyProfile.name}</p>
             <p>HDFC Bank // 1234567890</p>
          </div>
          <div className="sm:text-right">
             <p>{agencyProfile.email}</p>
             <p>{agencyProfile.website || 'agencyflow.app'}</p>
          </div>
       </div>
    </div>
  );

  const TaxInvoiceTemplate = () => (
    <div className="bg-white p-6 h-full font-arial text-slate-900 invoice-container text-xs">
       <h1 className="text-center font-bold text-sm mb-2 uppercase">Tax Invoice</h1>
       
       <div className="border border-black">
          {/* Header Section */}
          <div className="flex border-b border-black">
             {/* Left Column: Sender Info */}
             <div className="w-1/2 border-r border-black p-2 flex flex-col justify-between">
                <div>
                   <h2 className="font-bold text-base mb-1">{agencyProfile.name}</h2>
                   <p className="whitespace-pre-line mb-2">{agencyProfile.address}</p>
                   <p>GSTIN/UIN: {agencyProfile.gstIn}</p>
                   <div className="flex gap-1">
                      <span>State Name:</span>
                      <input 
                         type="text" 
                         value={taxFields.agencyState} 
                         onChange={e => handleUpdateTaxField('agencyState', e.target.value)}
                         className={`${editableInputClass} w-24`}
                      />, 
                      <span>Code:</span>
                      <input 
                         type="text" 
                         value={taxFields.agencyStateCode} 
                         onChange={e => handleUpdateTaxField('agencyStateCode', e.target.value)}
                         className={`${editableInputClass} w-8`}
                      />
                   </div>
                   <p>Email: {agencyProfile.email}</p>
                </div>
             </div>
             
             {/* Right Column: Invoice Details Grid */}
             <div className="w-1/2 grid grid-cols-2 text-xs">
                <div className="border-r border-b border-black p-1">
                   <span className="block font-bold">Invoice No.</span>
                   <input 
                      type="text" 
                      value={invoiceNumber} 
                      onChange={e => setInvoiceNumber(e.target.value)}
                      className={`${editableInputClass} w-full`}
                   />
                </div>
                <div className="border-b border-black p-1">
                   <span className="block font-bold">Dated</span>
                   <input 
                      type="text" 
                      value={invoiceDate} 
                      onChange={e => setInvoiceDate(e.target.value)}
                      className={`${editableInputClass} w-full`}
                   />
                </div>
                <div className="border-r border-b border-black p-1">
                   <span className="block font-bold">Delivery Note</span>
                   <input 
                      type="text" 
                      value={taxFields.deliveryNote} 
                      onChange={e => handleUpdateTaxField('deliveryNote', e.target.value)}
                      className={`${editableInputClass} w-full`}
                   />
                </div>
                <div className="border-b border-black p-1">
                   <span className="block font-bold">Mode/Terms of Payment</span>
                   <input 
                      type="text" 
                      value={taxFields.modeOfPayment} 
                      onChange={e => handleUpdateTaxField('modeOfPayment', e.target.value)}
                      className={`${editableInputClass} w-full`}
                   />
                </div>
                <div className="border-r border-b border-black p-1">
                   <span className="block font-bold">Reference No. & Date.</span>
                   <input 
                      type="text" 
                      value={taxFields.referenceNo} 
                      onChange={e => handleUpdateTaxField('referenceNo', e.target.value)}
                      className={`${editableInputClass} w-full`}
                   />
                </div>
                <div className="border-b border-black p-1">
                   <span className="block font-bold">Other References</span>
                   <input 
                      type="text" 
                      value={taxFields.otherReferences} 
                      onChange={e => handleUpdateTaxField('otherReferences', e.target.value)}
                      className={`${editableInputClass} w-full`}
                   />
                </div>
                <div className="border-r border-b border-black p-1">
                   <span className="block font-bold">Buyer's Order No.</span>
                   <input 
                      type="text" 
                      value={taxFields.buyersOrderNo} 
                      onChange={e => handleUpdateTaxField('buyersOrderNo', e.target.value)}
                      className={`${editableInputClass} w-full`}
                   />
                </div>
                <div className="border-b border-black p-1">
                   <span className="block font-bold">Dated</span>
                   <input 
                      type="text" 
                      value={taxFields.buyersOrderDate} 
                      onChange={e => handleUpdateTaxField('buyersOrderDate', e.target.value)}
                      className={`${editableInputClass} w-full`}
                   />
                </div>
                <div className="border-r border-b border-black p-1">
                   <span className="block font-bold">Dispatch Doc No.</span>
                   <input 
                      type="text" 
                      value={taxFields.dispatchDocNo} 
                      onChange={e => handleUpdateTaxField('dispatchDocNo', e.target.value)}
                      className={`${editableInputClass} w-full`}
                   />
                </div>
                <div className="border-b border-black p-1">
                   <span className="block font-bold">Delivery Note Date</span>
                   <input 
                      type="text" 
                      value={taxFields.deliveryNoteDate} 
                      onChange={e => handleUpdateTaxField('deliveryNoteDate', e.target.value)}
                      className={`${editableInputClass} w-full`}
                   />
                </div>
                <div className="border-r border-b border-black p-1">
                   <span className="block font-bold">Dispatched through</span>
                   <input 
                      type="text" 
                      value={taxFields.dispatchedThrough} 
                      onChange={e => handleUpdateTaxField('dispatchedThrough', e.target.value)}
                      className={`${editableInputClass} w-full`}
                   />
                </div>
                <div className="border-b border-black p-1">
                   <span className="block font-bold">Destination</span>
                   <input 
                      type="text" 
                      value={taxFields.destination} 
                      onChange={e => handleUpdateTaxField('destination', e.target.value)}
                      className={`${editableInputClass} w-full`}
                   />
                </div>
                <div className="col-span-2 p-1 min-h-[40px]">
                   <span className="block font-bold">Terms of Delivery</span>
                   <textarea 
                      value={taxFields.termsOfDelivery} 
                      onChange={e => handleUpdateTaxField('termsOfDelivery', e.target.value)}
                      className={`${editableInputClass} w-full resize-none h-8`}
                   />
                </div>
             </div>
          </div>

          {/* Consignee Section */}
          <div className="flex border-b border-black">
             <div className="w-1/2 border-r border-black p-2">
                <span className="block font-bold text-xs mb-1">Consignee (Ship to)</span>
                <input 
                   type="text" 
                   value={taxFields.consigneeName} 
                   onChange={e => handleUpdateTaxField('consigneeName', e.target.value)}
                   className={`${editableInputClass} font-bold w-full mb-0.5`}
                />
                <textarea 
                   value={taxFields.consigneeAddress} 
                   onChange={e => handleUpdateTaxField('consigneeAddress', e.target.value)}
                   className={`${editableInputClass} w-full resize-none h-12 mb-1`}
                />
                <div className="flex gap-1">
                   <span>GSTIN/UIN :</span>
                   <input 
                      type="text" 
                      value={taxFields.consigneeGST} 
                      onChange={e => handleUpdateTaxField('consigneeGST', e.target.value)}
                      className={`${editableInputClass} w-32`}
                   />
                </div>
                <div className="flex gap-1">
                   <span>State Name :</span>
                   <input 
                      type="text" 
                      value={taxFields.consigneeState} 
                      onChange={e => handleUpdateTaxField('consigneeState', e.target.value)}
                      className={`${editableInputClass} w-24`}
                   />, 
                   <span>Code :</span>
                   <input 
                      type="text" 
                      value={taxFields.consigneeCode} 
                      onChange={e => handleUpdateTaxField('consigneeCode', e.target.value)}
                      className={`${editableInputClass} w-8`}
                   />
                </div>
             </div>
             <div className="w-1/2 p-2 bg-slate-50 flex items-center justify-center text-slate-400 italic">
                (Buyer details same as Consignee)
             </div>
          </div>

          {/* Buyer Section */}
          <div className="flex border-b border-black">
             <div className="w-1/2 border-r border-black p-2">
                <span className="block font-bold text-xs mb-1">Buyer (Bill to)</span>
                <input 
                   type="text" 
                   value={taxFields.buyerName} 
                   onChange={e => handleUpdateTaxField('buyerName', e.target.value)}
                   className={`${editableInputClass} font-bold w-full mb-0.5`}
                />
                <textarea 
                   value={taxFields.buyerAddress} 
                   onChange={e => handleUpdateTaxField('buyerAddress', e.target.value)}
                   className={`${editableInputClass} w-full resize-none h-12 mb-1`}
                />
                <div className="flex gap-1">
                   <span>GSTIN/UIN :</span>
                   <input 
                      type="text" 
                      value={taxFields.buyerGST} 
                      onChange={e => handleUpdateTaxField('buyerGST', e.target.value)}
                      className={`${editableInputClass} w-32`}
                   />
                </div>
                <div className="flex gap-1">
                   <span>State Name :</span>
                   <input 
                      type="text" 
                      value={taxFields.buyerState} 
                      onChange={e => handleUpdateTaxField('buyerState', e.target.value)}
                      className={`${editableInputClass} w-24`}
                   />, 
                   <span>Code :</span>
                   <input 
                      type="text" 
                      value={taxFields.buyerCode} 
                      onChange={e => handleUpdateTaxField('buyerCode', e.target.value)}
                      className={`${editableInputClass} w-8`}
                   />
                </div>
             </div>
             <div className="w-1/2 p-2">
                {/* Space for extra details if needed */}
             </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse">
            <thead>
               <tr className="border-b border-black text-center">
                  <th className="border-r border-black p-1 w-10">Sl No.</th>
                  <th className="border-r border-black p-1 text-left">Particulars</th>
                  <th className="border-r border-black p-1 w-24">HSN/SAC</th>
                  <th className="border-r border-black p-1 w-16">GST Rate</th>
                  <th className="p-1 w-32">Amount</th>
               </tr>
            </thead>
            <tbody>
               {items.map((item, idx) => (
                  <tr key={idx} className="align-top">
                     <td className="border-r border-black p-1 text-center">{idx + 1}</td>
                     <td className="border-r border-black p-1">
                        <input 
                          type="text" 
                          value={item.description}
                          onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                          className={`${editableInputClass} font-bold text-xs w-full mb-1`}
                        />
                        <input 
                           type="text"
                           value={taxFields.subDescription}
                           onChange={e => handleUpdateTaxField('subDescription', e.target.value)}
                           className={`${editableInputClass} text-[10px] italic pl-1 w-full`}
                        />
                        {/* Breakdown lines */}
                        <div className="flex justify-end mt-2 pr-2 text-[10px]">
                           <span className="mr-4">CGST</span>
                           <span>{formatCurrency((item.rate * item.quantity) * 0.09).replace('₹', '')}</span>
                        </div>
                        <div className="flex justify-end pr-2 text-[10px]">
                           <span className="mr-4">SGST</span>
                           <span>{formatCurrency((item.rate * item.quantity) * 0.09).replace('₹', '')}</span>
                        </div>
                     </td>
                     <td className="border-r border-black p-1 text-center">
                        <input 
                          type="text" 
                          value={item.hsn}
                          onChange={(e) => handleUpdateItem(idx, 'hsn', e.target.value)}
                          className={`${editableInputClass} text-center w-full`}
                        />
                     </td>
                     <td className="border-r border-black p-1 text-center">18%</td>
                     <td className="p-1 text-right font-bold">
                        <input 
                          type="number" 
                          value={item.rate}
                          onChange={(e) => handleUpdateItem(idx, 'rate', parseFloat(e.target.value))}
                          className={`${editableInputClass} text-right font-bold`}
                        />
                        <div className="mt-2 text-[10px] text-right">
                           {formatCurrency((item.rate * item.quantity) * 0.09).replace('₹', '')}
                        </div>
                        <div className="text-[10px] text-right">
                           {formatCurrency((item.rate * item.quantity) * 0.09).replace('₹', '')}
                        </div>
                     </td>
                  </tr>
               ))}
               
               {/* Spacer Rows to fill height if needed */}
               {items.length < 3 && Array.from({length: 3 - items.length}).map((_, i) => (
                  <tr key={`spacer-${i}`}>
                     <td className="border-r border-black p-1">&nbsp;</td>
                     <td className="border-r border-black p-1">&nbsp;</td>
                     <td className="border-r border-black p-1">&nbsp;</td>
                     <td className="border-r border-black p-1">&nbsp;</td>
                     <td className="p-1">&nbsp;</td>
                  </tr>
               ))}

               {/* Total Row */}
               <tr className="border-t border-black font-bold">
                  <td className="border-r border-black p-1"></td>
                  <td className="border-r border-black p-1 text-right">Total</td>
                  <td className="border-r border-black p-1"></td>
                  <td className="border-r border-black p-1"></td>
                  <td className="p-1 text-right text-sm">₹ {formatCurrency(totalAmount).replace('₹', '')}</td>
               </tr>
            </tbody>
          </table>

          {/* Amount in Words */}
          <div className="border-t border-black p-2 flex justify-between items-end">
             <div>
                <span className="text-[10px] block">Amount Chargeable (in words)</span>
                <span className="font-bold">{numberToWords(totalAmount)}</span>
             </div>
             <div className="text-[10px] italic">E. & O.E</div>
          </div>

          {/* Tax Analysis Header */}
          <div className="border-t border-black grid grid-cols-12 text-center text-[10px]">
             <div className="col-span-3 border-r border-black p-1 border-b">HSN/SAC</div>
             <div className="col-span-3 border-r border-black p-1 border-b">Taxable Value</div>
             <div className="col-span-2 border-r border-black p-1 border-b">
                <div className="border-b border-black -mx-1 -mt-1 p-1 bg-slate-50">Central Tax</div>
                <div className="grid grid-cols-2 mt-1">
                   <div className="border-r border-black">Rate</div>
                   <div>Amount</div>
                </div>
             </div>
             <div className="col-span-2 border-r border-black p-1 border-b">
                <div className="border-b border-black -mx-1 -mt-1 p-1 bg-slate-50">State Tax</div>
                <div className="grid grid-cols-2 mt-1">
                   <div className="border-r border-black">Rate</div>
                   <div>Amount</div>
                </div>
             </div>
             <div className="col-span-2 p-1 border-b">Total Tax Amount</div>
          </div>

          {/* Tax Analysis Body */}
          <div className="grid grid-cols-12 text-center text-[10px]">
             <div className="col-span-3 border-r border-black p-1">{items[0]?.hsn || '998361'}</div>
             <div className="col-span-3 border-r border-black p-1">{formatCurrency(taxableValue).replace('₹', '')}</div>
             <div className="col-span-2 border-r border-black grid grid-cols-2">
                <div className="border-r border-black p-1">9%</div>
                <div className="p-1">{formatCurrency(cgstAmount).replace('₹', '')}</div>
             </div>
             <div className="col-span-2 border-r border-black grid grid-cols-2">
                <div className="border-r border-black p-1">9%</div>
                <div className="p-1">{formatCurrency(sgstAmount).replace('₹', '')}</div>
             </div>
             <div className="col-span-2 p-1">{formatCurrency(gstAmount).replace('₹', '')}</div>
          </div>

          {/* Tax Analysis Total */}
          <div className="border-t border-black grid grid-cols-12 text-center text-[10px] font-bold">
             <div className="col-span-3 border-r border-black p-1 text-right pr-2">Total</div>
             <div className="col-span-3 border-r border-black p-1">{formatCurrency(taxableValue).replace('₹', '')}</div>
             <div className="col-span-2 border-r border-black grid grid-cols-2">
                <div className="border-r border-black p-1"></div>
                <div className="p-1">{formatCurrency(cgstAmount).replace('₹', '')}</div>
             </div>
             <div className="col-span-2 border-r border-black grid grid-cols-2">
                <div className="border-r border-black p-1"></div>
                <div className="p-1">{formatCurrency(sgstAmount).replace('₹', '')}</div>
             </div>
             <div className="col-span-2 p-1">{formatCurrency(gstAmount).replace('₹', '')}</div>
          </div>

          {/* Tax Words & Signature */}
          <div className="border-t border-black flex">
             <div className="w-1/2 border-r border-black p-2 flex flex-col justify-between">
                <div>
                   <span className="text-[10px] block">Tax Amount (in words) : </span>
                   <span className="font-bold">{numberToWords(gstAmount)}</span>
                </div>
                <div className="mt-4 text-[10px]">
                   <p className="underline mb-1">Declaration</p>
                   <p>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
                </div>
             </div>
             <div className="w-1/2 p-2 flex flex-col justify-between items-end text-right">
                <div className="text-[10px] w-full border-b border-black pb-1 mb-8">
                   for {agencyProfile.name}
                </div>
                <div className="text-center w-32 border-t border-black pt-1 mt-8">
                   Authorised Signatory
                </div>
             </div>
          </div>
       </div>
       <p className="text-center text-[10px] mt-2">This is a Computer Generated Invoice</p>
    </div>
  );

  const CustomTemplate = () => (
    <div 
      className="bg-white min-h-[800px] invoice-container p-8"
      dangerouslySetInnerHTML={processCustomTemplate()}
    />
  );

  return (
    <div className="bg-slate-50 min-h-screen font-sans flex flex-col print:block print:bg-white print:h-auto print:overflow-visible">
      
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm px-4 py-3 no-print">
         <div className="max-w-6xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="h-6 w-px bg-slate-200 hidden lg:block"></div>
              
              <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-hide">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                  <LayoutTemplate className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Theme</span>
                </div>
                
                {/* Visual Selector: Modern */}
                <button 
                  onClick={() => setCurrentTemplate('MODERN')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all whitespace-nowrap ${
                    currentTemplate === 'MODERN' 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-200' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {currentTemplate === 'MODERN' ? <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" /> : <div className="w-3 h-3 rounded-full bg-indigo-500"></div>}
                  Modern
                </button>
                
                {/* Visual Selector: Classic */}
                <button 
                  onClick={() => setCurrentTemplate('CLASSIC')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-serif font-bold transition-all whitespace-nowrap ${
                    currentTemplate === 'CLASSIC' 
                      ? 'bg-slate-100 border-slate-300 text-slate-900 ring-1 ring-slate-300' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                   {currentTemplate === 'CLASSIC' ? <CheckCircle2 className="h-3.5 w-3.5 text-slate-900" /> : <span className="font-serif italic font-black text-xs">T</span>}
                   Classic
                </button>

                {/* Visual Selector: Minimal */}
                <button 
                  onClick={() => setCurrentTemplate('MINIMAL')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap ${
                    currentTemplate === 'MINIMAL' 
                      ? 'bg-white border-slate-800 text-slate-900 ring-1 ring-slate-800' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {currentTemplate === 'MINIMAL' ? <CheckCircle2 className="h-3.5 w-3.5 text-slate-900" /> : <div className="w-3 h-3 border border-slate-900 bg-white"></div>}
                   Minimal
                </button>

                {/* Visual Selector: Tax Invoice */}
                <button 
                  onClick={() => setCurrentTemplate('TAX')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all whitespace-nowrap ${
                    currentTemplate === 'TAX' 
                      ? 'bg-slate-800 border-slate-900 text-white ring-1 ring-slate-700' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {currentTemplate === 'TAX' ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : <FileText className="h-3 w-3" />}
                   Tax Invoice
                </button>
                
                 {/* Visual Selector: Custom */}
                <button 
                  onClick={() => setCurrentTemplate('CUSTOM')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all whitespace-nowrap ${
                    currentTemplate === 'CUSTOM' 
                      ? 'bg-amber-50 border-amber-200 text-amber-700 ring-1 ring-amber-200' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {currentTemplate === 'CUSTOM' ? <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" /> : <Code className="h-3 w-3" />}
                   Custom
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
               {currentTemplate === 'CUSTOM' && (
                  <button 
                    onClick={() => setIsEditingCustom(true)} 
                    className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all" 
                    title="Edit Custom Template Code"
                  >
                    <Code className="h-5 w-5" />
                  </button>
               )}
               <button onClick={() => setIsEditing(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition-all" title="Edit Business Info">
                  <Settings className="h-5 w-5" />
               </button>
               <div className="h-6 w-px bg-slate-200"></div>
               <button onClick={handleWhatsAppShare} className="flex items-center gap-2 bg-[#25D366] text-white px-3 py-2 rounded-lg hover:bg-[#20bd5a] transition-colors shadow-sm text-sm font-medium">
                  <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">WhatsApp</span>
               </button>
               <button onClick={handleEmailShare} className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium">
                  <Mail className="h-4 w-4" /> <span className="hidden sm:inline">Email</span>
               </button>
               <button onClick={handlePrint} type="button" className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium">
                  <Printer className="h-4 w-4" /> Print
               </button>
            </div>
         </div>
      </div>

      {/* Editor Modal for Business Details */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6 no-print animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden">
             
             {/* Header */}
             <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white z-10">
               <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-indigo-600" /> Business Details
               </h3>
               <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                  <Settings className="h-5 w-5 rotate-45" />
               </button>
             </div>
             
             {/* Scrollable Body */}
             <div className="p-6 overflow-y-auto modal-scroll space-y-6 flex-1 bg-slate-50/50">
                {/* Logo Section */}
                <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                   <div className="h-16 w-16 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                      {editForm.logoUrl ? (
                         <img src={editForm.logoUrl} alt="Preview" className="h-full w-full object-contain" />
                      ) : (
                         <ImageIcon className="h-6 w-6 text-slate-300" />
                      )}
                   </div>
                   <div className="flex-1">
                      <label className="block text-sm font-semibold text-slate-900 mb-1">Company Logo</label>
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm">
                         <Upload className="h-3 w-3" /> Upload New
                         <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                      <p className="text-[10px] text-slate-500 mt-2">Recommended: PNG with transparent background.</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                   <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Agency Name</label>
                      <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className={inputClass} />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">GSTIN</label>
                      <input type="text" value={editForm.gstIn} onChange={e => setEditForm({...editForm, gstIn: e.target.value})} className={inputClass} />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
                      <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className={inputClass} />
                   </div>
                   <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                      <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className={inputClass} />
                   </div>
                   <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Website</label>
                      <input type="text" value={editForm.website} onChange={e => setEditForm({...editForm, website: e.target.value})} className={inputClass} placeholder="www.youragency.com" />
                   </div>
                   <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
                      <textarea value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className={`${inputClass} resize-none h-24`} />
                   </div>
                </div>
             </div>

             {/* Footer */}
             <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-white">
                <button onClick={() => setIsEditing(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors">Cancel</button>
                <button onClick={saveProfile} className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium shadow-md shadow-indigo-100 transition-all flex items-center gap-2">
                   <Check className="h-4 w-4" /> Save Details
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Editor Modal for Custom Template */}
      {isEditingCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 no-print animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 flex flex-col h-[85vh] overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white z-10">
                 <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileCode className="h-5 w-5 text-indigo-600" /> Edit Custom Template
                 </h3>
                 <button onClick={() => setIsEditingCustom(false)} className="text-slate-400 hover:text-slate-600 p-1">
                    <Settings className="h-5 w-5 rotate-45" />
                 </button>
              </div>

              <div className="flex flex-1 overflow-hidden">
                 {/* Sidebar for Variables */}
                 <div className="w-1/3 bg-slate-50 border-r border-slate-200 overflow-y-auto p-5 hidden md:block">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                       <Info className="h-3 w-3" /> Available Variables
                    </h4>
                    <div className="space-y-6">
                       <div>
                          <p className="text-xs font-semibold text-slate-900 mb-2">Agency Info</p>
                          <div className="flex flex-wrap gap-2">
                             {['agency_name', 'agency_address', 'agency_phone', 'agency_email', 'agency_website', 'agency_gst', 'logo_url'].map(v => (
                                <code key={v} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 select-all cursor-pointer hover:border-indigo-300">{`{{${v}}}`}</code>
                             ))}
                          </div>
                       </div>
                       <div>
                          <p className="text-xs font-semibold text-slate-900 mb-2">Client Info</p>
                          <div className="flex flex-wrap gap-2">
                             {['client_name', 'client_business', 'client_address', 'client_phone', 'client_gst'].map(v => (
                                <code key={v} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 select-all cursor-pointer hover:border-indigo-300">{`{{${v}}}`}</code>
                             ))}
                          </div>
                       </div>
                       <div>
                          <p className="text-xs font-semibold text-slate-900 mb-2">Financials</p>
                          <div className="flex flex-wrap gap-2">
                             {['invoice_number', 'date', 'total_amount', 'paid_amount', 'due_amount', 'subtotal', 'gst_amount'].map(v => (
                                <code key={v} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 select-all cursor-pointer hover:border-indigo-300">{`{{${v}}}`}</code>
                             ))}
                          </div>
                       </div>
                       <div>
                          <p className="text-xs font-semibold text-slate-900 mb-2">Table Rows (Auto-generated)</p>
                          <code className="text-[10px] bg-indigo-50 border border-indigo-200 px-2 py-1 rounded text-indigo-700 select-all font-bold">{'{{services_table_rows}}'}</code>
                          <p className="text-[10px] text-slate-400 mt-1 leading-tight">Injects &lt;tr&gt;&lt;td&gt;...&lt;/td&gt;&lt;/tr&gt; rows automatically.</p>
                       </div>
                    </div>
                 </div>

                 {/* Code Editor */}
                 <div className="flex-1 flex flex-col">
                    <textarea 
                       className="flex-1 w-full p-4 font-mono text-sm bg-slate-900 text-slate-300 focus:outline-none resize-none"
                       value={customCode}
                       onChange={(e) => setCustomCode(e.target.value)}
                       spellCheck={false}
                    />
                 </div>
              </div>

              <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-white">
                 <button 
                   onClick={() => setCustomCode(DEFAULT_CUSTOM_TEMPLATE)} 
                   className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                 >
                    <RotateCcw className="h-3 w-3" /> Reset to Default
                 </button>
                 <div className="flex gap-3">
                   <button onClick={() => setIsEditingCustom(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors">Cancel</button>
                   <button onClick={saveCustomTemplate} className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium shadow-md transition-all flex items-center gap-2">
                      <Check className="h-4 w-4" /> Save Template
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Main Invoice Canvas */}
      <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-100 flex justify-center items-start invoice-scroll-wrapper print:overflow-visible print:block print:h-auto print:p-0 print:m-0">
         <div 
           ref={invoiceRef}
           className="w-full max-w-[210mm] bg-white shadow-xl rounded-sm print:shadow-none print:w-full print:max-w-none print:m-0" 
           id="printable-invoice"
         >
            {currentTemplate === 'MODERN' && <ModernTemplate />}
            {currentTemplate === 'CLASSIC' && <ClassicTemplate />}
            {currentTemplate === 'MINIMAL' && <MinimalTemplate />}
            {currentTemplate === 'TAX' && <TaxInvoiceTemplate />}
            {currentTemplate === 'CUSTOM' && <CustomTemplate />}
         </div>
      </div>
    </div>
  );
};

export default InvoiceGenerator;