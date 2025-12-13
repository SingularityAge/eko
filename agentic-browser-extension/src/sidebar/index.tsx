// ============================================
// Sidebar UI - Control Panel
// Redesigned with warm Anthropic Claude aesthetics
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserState, Activity, Credential } from '../shared/types';

// Country list (alphabetically sorted)
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei",
  "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic",
  "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus",
  "Czech Republic", "Denmark", "Djibouti", "Dominican Republic", "Ecuador", "Egypt", "El Salvador",
  "Estonia", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana",
  "Greece", "Guatemala", "Guinea", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan",
  "Kenya", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
  "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali",
  "Malta", "Mauritania", "Mauritius", "Mexico", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco",
  "Mozambique", "Myanmar", "Namibia", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger",
  "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Panama", "Papua New Guinea",
  "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
  "Saudi Arabia", "Senegal", "Serbia", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Somalia",
  "South Africa", "South Korea", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Trinidad and Tobago", "Tunisia",
  "Turkey", "Turkmenistan", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States",
  "Uruguay", "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

// Icons
const GearIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B8C5A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const SparklesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"></path>
    <path d="M19 13l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"></path>
  </svg>
);

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const UploadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const KeyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#DA7756" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
  </svg>
);

const EmailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const RefreshIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
    <path d="M21 3v5h-5"></path>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
    <path d="M3 21v-5h5"></path>
  </svg>
);

const PlayIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="#2D2A26" stroke="none">
    <polygon points="6,4 20,12 6,20" />
  </svg>
);

const PauseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="#2D2A26" stroke="none">
    <rect x="5" y="4" width="5" height="16" rx="1" />
    <rect x="14" y="4" width="5" height="16" rx="1" />
  </svg>
);

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600&family=Vollkorn:wght@500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(180deg, #FDF8F6 0%, #FFF9F7 100%);
    color: #2D2A26;
    font-size: 14px;
    line-height: 1.5;
  }

  .container {
    padding: 20px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(218, 119, 86, 0.15);
    margin-bottom: 20px;
  }

  .header h1 {
    font-family: 'Vollkorn', Georgia, serif;
    font-size: 26px;
    font-weight: 500;
    color: #DA7756;
    letter-spacing: -0.5px;
  }

  .header .status {
    font-size: 13px;
    color: #7A746D;
    margin-top: 4px;
    font-weight: 400;
  }
  .status.ready { color: #5B8C5A; }
  .status.running { color: #4A90A4; }
  .status.paused { color: #C4884C; }

  .gear-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 10px;
    color: #9A938B;
    transition: all 0.2s;
  }
  .gear-btn:hover {
    background: rgba(218, 119, 86, 0.1);
    color: #DA7756;
  }

  /* Controls */
  .controls {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 20px;
  }

  .play-pause-btn {
    width: 52px;
    height: 52px;
    border: none;
    border-radius: 12px;
    background: #FAF6F3;
    border: 1px solid #E8E2DC;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }
  .play-pause-btn:hover {
    background: #F0EBE6;
    border-color: #D4CFC9;
  }
  .play-pause-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .play-pause-btn svg {
    color: #2D2A26;
  }

  .stats-inline {
    display: flex;
    gap: 8px;
    flex: 1;
  }

  .stat-inline {
    background: white;
    padding: 10px 16px;
    border-radius: 10px;
    border: 1px solid rgba(218, 119, 86, 0.1);
    box-shadow: 0 2px 8px rgba(45, 42, 38, 0.04);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-width: 0;
  }

  .stat-inline-value {
    font-size: 20px;
    font-weight: 600;
    color: #DA7756;
    line-height: 1.2;
  }

  .stat-inline-label {
    font-size: 10px;
    color: #9A938B;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .btn {
    padding: 12px 28px;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: 'Google Sans', sans-serif;
  }

  .btn-primary {
    background: linear-gradient(135deg, #DA7756 0%, #C4684A 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(218, 119, 86, 0.3);
  }
  .btn-primary:hover {
    background: linear-gradient(135deg, #C4684A 0%, #B55D40 100%);
    box-shadow: 0 4px 12px rgba(218, 119, 86, 0.4);
    transform: translateY(-1px);
  }
  .btn-primary:disabled {
    background: #D4CFC9;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }

  .btn-secondary {
    background: #FAF6F3;
    color: #5A544D;
    border: 1px solid #E8E2DC;
  }
  .btn-secondary:hover {
    background: #F0EBE6;
    border-color: #D4CFC9;
  }

  .btn-danger {
    background: #E57373;
    color: white;
  }
  .btn-danger:hover {
    background: #D45858;
  }


  /* Current Action Box */
  .current-action {
    background: white;
    border: 1px solid rgba(74, 144, 164, 0.15);
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(45, 42, 38, 0.04);
  }

  .current-action-label {
    font-size: 11px;
    color: #9A938B;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
    font-weight: 500;
  }

  .current-action-text {
    font-size: 14px;
    color: #4A4641;
    word-break: break-word;
  }

  .url-box {
    background: #FAF8F6;
    border: 1px solid #E8E2DC;
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 16px;
  }

  .section-title {
    font-size: 12px;
    font-weight: 600;
    color: #9A938B;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }

  /* Persona Box */
  .persona-box {
    background: white;
    border: 1px solid rgba(218, 119, 86, 0.12);
    border-radius: 14px;
    padding: 18px;
    margin-bottom: 16px;
    box-shadow: 0 2px 12px rgba(218, 119, 86, 0.06);
  }

  .persona-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }

  .persona-title {
    font-size: 12px;
    color: #9A938B;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }

  .persona-icons {
    display: flex;
    gap: 5px;
  }

  .persona-icons button {
    background: #FAF6F3;
    border: 1px solid #E8E2DC;
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    color: #7A746D;
    transition: all 0.2s;
  }
  .persona-icons button svg {
    width: 14px;
    height: 14px;
  }
  .persona-icons button:hover {
    background: #F0EBE6;
    color: #5A544D;
    border-color: #D4CFC9;
  }

  .placeholder-bar {
    background: linear-gradient(90deg, #E8E2DC 0%, #D4CFC9 50%, #E8E2DC 100%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 6px;
    height: 16px;
    margin-bottom: 10px;
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  .placeholder-bar.short { width: 55%; }
  .placeholder-bar.medium { width: 75%; }
  .placeholder-bar.long { width: 100%; }

  .location-row {
    display: flex;
    gap: 10px;
    margin-bottom: 12px;
  }

  .location-row select, .location-row input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #E8E2DC;
    border-radius: 10px;
    font-size: 14px;
    font-family: 'Google Sans', sans-serif;
    background: #FDFBFA;
    color: #4A4641;
    transition: all 0.2s;
  }
  .location-row select:focus, .location-row input:focus {
    outline: none;
    border-color: #DA7756;
    box-shadow: 0 0 0 3px rgba(218, 119, 86, 0.1);
  }
  .location-row select:disabled, .location-row input:disabled {
    background: #F5F2EF;
    cursor: not-allowed;
    color: #B5AFA8;
  }

  .city-wrapper {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
  }
  .city-wrapper input {
    width: 100%;
    padding-right: 36px;
  }

  .city-check {
    position: absolute;
    right: 12px;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .city-check.visible { opacity: 1; }
  .city-check.fade-out { animation: fadeOut 2s forwards; }
  @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }

  .city-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #E8E2DC;
    border-radius: 10px;
    max-height: 180px;
    overflow-y: auto;
    z-index: 10;
    box-shadow: 0 4px 16px rgba(45, 42, 38, 0.12);
    margin-top: 4px;
  }

  .city-suggestion {
    padding: 10px 14px;
    cursor: pointer;
    font-size: 14px;
    color: #4A4641;
    transition: background 0.15s;
  }
  .city-suggestion:hover {
    background: #FDF8F6;
  }
  .city-suggestion:first-child {
    border-radius: 10px 10px 0 0;
  }
  .city-suggestion:last-child {
    border-radius: 0 0 10px 10px;
  }

  .generate-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #DA7756;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    padding: 10px 0;
    opacity: 0;
    animation: fadeIn 0.5s forwards;
    transition: color 0.2s;
  }
  .generate-btn:hover {
    color: #C4684A;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

  .persona-data {
    animation: fadeIn 0.5s forwards;
  }
  .persona-name {
    font-size: 17px;
    font-weight: 600;
    color: #2D2A26;
    margin-bottom: 4px;
  }
  .persona-details {
    font-size: 14px;
    color: #7A746D;
    margin-bottom: 4px;
  }
  .persona-interests {
    font-size: 13px;
    color: #9A938B;
    margin-top: 8px;
    line-height: 1.6;
  }

  /* Activities */
  .activities {
    flex: 1;
    overflow-y: auto;
    max-height: 180px;
    background: white;
    border: 1px solid #E8E2DC;
    border-radius: 12px;
    padding: 4px;
  }

  .activity {
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 13px;
    margin: 2px;
    transition: background 0.15s;
  }
  .activity:hover {
    background: #FAF8F6;
  }

  .activity-type {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-right: 8px;
  }
  .activity-type.navigation { background: #E3F2FD; color: #1976D2; }
  .activity-type.click { background: #F3E5F5; color: #7B1FA2; }
  .activity-type.type { background: #E8F5E9; color: #388E3C; }
  .activity-type.scroll { background: #FFF3E0; color: #F57C00; }
  .activity-type.search { background: #FCE4EC; color: #C2185B; }
  .activity-type.error { background: #FFEBEE; color: #D32F2F; }

  .activity-time {
    color: #B5AFA8;
    font-size: 11px;
    float: right;
  }

  .activity-details {
    margin-top: 4px;
    color: #7A746D;
    font-size: 12px;
    line-height: 1.4;
  }

  .empty-state {
    text-align: center;
    padding: 24px;
    color: #9A938B;
    font-size: 14px;
  }

  /* Glassmorphism Overlay */
  .glass-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(253, 248, 246, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    animation: overlayFadeIn 0.3s ease;
  }
  @keyframes overlayFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .glass-card {
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(218, 119, 86, 0.2);
    border-radius: 20px;
    padding: 32px;
    max-width: 280px;
    text-align: center;
    box-shadow: 0 8px 32px rgba(45, 42, 38, 0.12);
    animation: cardSlideUp 0.4s ease;
  }
  @keyframes cardSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .glass-card h2 {
    font-family: 'Vollkorn', Georgia, serif;
    font-size: 22px;
    font-weight: 500;
    color: #2D2A26;
    margin: 16px 0 12px;
  }

  .glass-card p {
    font-size: 14px;
    color: #7A746D;
    margin-bottom: 24px;
    line-height: 1.6;
  }

  .glass-card .btn {
    width: 100%;
  }

  /* Settings Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(45, 42, 38, 0.4);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    animation: overlayFadeIn 0.2s ease;
  }

  .modal-content {
    background: white;
    border-radius: 20px;
    padding: 24px;
    width: calc(100% - 40px);
    max-width: 340px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 16px 48px rgba(45, 42, 38, 0.2);
    animation: modalSlideUp 0.3s ease;
  }
  @keyframes modalSlideUp {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .modal-header h2 {
    font-family: 'Vollkorn', Georgia, serif;
    font-size: 22px;
    font-weight: 500;
    color: #2D2A26;
  }

  .modal-close {
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    color: #9A938B;
    transition: all 0.2s;
  }
  .modal-close:hover {
    background: #FAF6F3;
    color: #5A544D;
  }

  .form-group {
    margin-bottom: 18px;
  }

  .form-group label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 6px;
    color: #5A544D;
  }

  .form-group input, .form-group select {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #E8E2DC;
    border-radius: 10px;
    font-size: 14px;
    font-family: 'Google Sans', sans-serif;
    background: #FDFBFA;
    color: #4A4641;
    transition: all 0.2s;
  }
  .form-group input:focus, .form-group select:focus {
    outline: none;
    border-color: #DA7756;
    box-shadow: 0 0 0 3px rgba(218, 119, 86, 0.1);
  }

  .form-group .hint {
    font-size: 12px;
    color: #9A938B;
    margin-top: 6px;
  }

  .model-confirm {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding: 8px 12px;
    background: rgba(91, 140, 90, 0.1);
    border-radius: 8px;
    font-size: 13px;
    color: #5B8C5A;
  }

  /* Credentials Section */
  .credentials-section {
    margin-top: 16px;
    border-top: 1px solid #E8E2DC;
    padding-top: 16px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .section-header h3 {
    font-size: 14px;
    font-weight: 600;
    color: #5A544D;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-actions {
    display: flex;
    gap: 6px;
  }

  .icon-btn {
    background: #FAF6F3;
    border: 1px solid #E8E2DC;
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    color: #7A746D;
    transition: all 0.2s;
  }
  .icon-btn:hover {
    background: #F0EBE6;
    color: #5A544D;
    border-color: #D4CFC9;
  }

  .cred-dropdown {
    margin-bottom: 12px;
  }

  .cred-dropdown-btn {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #E8E2DC;
    border-radius: 10px;
    background: #FDFBFA;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    color: #4A4641;
    transition: all 0.2s;
  }
  .cred-dropdown-btn:hover {
    border-color: #DA7756;
  }
  .cred-dropdown-btn.open {
    border-color: #DA7756;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .cred-dropdown-list {
    border: 1px solid #DA7756;
    border-top: none;
    border-radius: 0 0 10px 10px;
    background: white;
    max-height: 150px;
    overflow-y: auto;
  }

  .cred-dropdown-item {
    padding: 10px 14px;
    cursor: pointer;
    font-size: 13px;
    color: #4A4641;
    transition: background 0.15s;
    border-bottom: 1px solid #F0EBE6;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .cred-dropdown-item:last-child {
    border-bottom: none;
  }
  .cred-dropdown-item:hover {
    background: #FDF8F6;
  }
  .cred-dropdown-item.selected {
    background: rgba(218, 119, 86, 0.1);
  }

  .cred-delete-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: #B5AFA8;
    transition: color 0.2s;
    display: flex;
  }
  .cred-delete-btn:hover {
    color: #E57373;
  }

  .cred-details {
    background: #FAF8F6;
    border: 1px solid #E8E2DC;
    border-radius: 10px;
    padding: 14px;
    margin-top: 8px;
    animation: fadeIn 0.3s ease;
  }

  .cred-detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    font-size: 13px;
  }
  .cred-detail-row:not(:last-child) {
    border-bottom: 1px solid #E8E2DC;
  }

  .cred-detail-label {
    color: #9A938B;
    font-weight: 500;
  }

  .cred-detail-value {
    color: #4A4641;
    font-family: monospace;
    font-size: 12px;
  }

  .no-creds {
    text-align: center;
    padding: 16px;
    color: #9A938B;
    font-size: 13px;
    font-style: italic;
  }

  .email-section {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #E8E2DC;
  }

  .email-section h4 {
    font-size: 13px;
    font-weight: 500;
    color: #7A746D;
    margin: 0 0 10px 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .input-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .input-row input {
    flex: 1;
  }
`;

interface OpenRouterModel {
  id: string;
  name: string;
}

interface Persona {
  firstName: string;
  lastName: string;
  age: number;
  country: string;
  city: string;
  occupation: string;
  interests: string[];
  streetAddress?: string;
  state?: string;
  zipCode?: string;
}

function Sidebar() {
  const [state, setState] = useState<BrowserState>({
    status: 'idle',
    currentUrl: '',
    currentAction: 'Ready',
    totalActions: 0,
    errors: 0
  });
  const [hasApiKey, setHasApiKey] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Persona state
  const [persona, setPersona] = useState<Persona | null>(null);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [cityConfirmed, setCityConfirmed] = useState(false);
  const [cityCheckFading, setCityCheckFading] = useState(false);
  const [citySelectedFromAutocomplete, setCitySelectedFromAutocomplete] = useState(false);
  const [generatingPersona, setGeneratingPersona] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('anthropic/claude-sonnet-4');
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [modelConfirm, setModelConfirm] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);

  // Email settings for agent signups
  const [agentEmail, setAgentEmail] = useState('');
  const [agentEmailPassword, setAgentEmailPassword] = useState('');

  // Website credentials state
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [credDropdownOpen, setCredDropdownOpen] = useState(false);
  const [selectedCredId, setSelectedCredId] = useState<string | null>(null);
  const credFileInputRef = useRef<HTMLInputElement>(null);

  const loadState = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      if (response) {
        setState(response.state);
        setHasApiKey(response.hasApiKey);
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ACTIVITIES', payload: { limit: 15 } });
      if (Array.isArray(response)) {
        setActivities(response);
      }
    } catch (e) {
      console.error('Failed to load activities:', e);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response) {
        setApiKey(response.openRouterApiKey || '');
        setSelectedModel(response.model || 'anthropic/claude-sonnet-4');
        setHasApiKey(!!response.openRouterApiKey);
        setAgentEmail(response.agentEmail || '');
        setAgentEmailPassword(response.agentEmailPassword || '');
        if (response.persona) {
          setPersona(response.persona);
          setCountry(response.persona.country || '');
          setCity(response.persona.city || '');
        }
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const loadCredentials = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CREDENTIALS' });
      if (Array.isArray(response)) {
        setCredentials(response);
      }
    } catch (e) {
      console.error('Failed to load credentials:', e);
    }
  };

  const fetchModels = async () => {
    if (!apiKey) return;
    setLoadingModels(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_MODELS',
        payload: { apiKey }
      });
      if (response?.models) {
        setModels(response.models.map((m: any) => ({ id: m.id, name: m.name || m.id })));
      }
    } catch (e) {
      console.error('Failed to fetch models:', e);
    }
    setLoadingModels(false);
  };

  useEffect(() => {
    loadState();
    loadActivities();
    loadSettings();
    loadCredentials();

    const listener = (message: any) => {
      if (message.type === 'STATE_UPDATE') {
        setState(message.payload);
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    const interval = setInterval(() => {
      loadState();
      loadActivities();
    }, 2000);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (apiKey) {
      fetchModels();
    }
  }, [apiKey]);

  // City autocomplete
  const handleCityInput = async (value: string) => {
    setCity(value);
    setCityConfirmed(false);
    setCitySelectedFromAutocomplete(false);

    if (value.length >= 2 && country) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'AUTOCOMPLETE_CITY',
          payload: { country, query: value }
        });
        if (response?.cities && response.cities.length > 0) {
          setCitySuggestions(response.cities);
          setShowCitySuggestions(true);
        } else {
          setCitySuggestions([]);
          setShowCitySuggestions(false);
        }
      } catch (e) {
        setCitySuggestions([]);
      }
    } else {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
    }
  };

  const selectCity = (selectedCity: string) => {
    setCitySelectedFromAutocomplete(true);
    setCity(selectedCity);
    setCitySuggestions([]);
    setShowCitySuggestions(false);
    setCityConfirmed(true);
    setCityCheckFading(false);
    setTimeout(() => setCityCheckFading(true), 100);
    setTimeout(() => setCityConfirmed(false), 2100);
  };

  const confirmCity = () => {
    // Skip reformatting if city was selected from autocomplete
    if (citySelectedFromAutocomplete) {
      return;
    }
    if (city) {
      const formatted = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
      setCity(formatted);
      setShowCitySuggestions(false);
      setCityConfirmed(true);
      setCityCheckFading(false);
      setTimeout(() => setCityCheckFading(true), 100);
      setTimeout(() => setCityConfirmed(false), 2100);
    }
  };

  // Generate persona
  const generatePersona = async () => {
    if (!country || !city || !apiKey) return;

    setGeneratingPersona(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_PERSONA',
        payload: { country, city }
      });

      if (response?.persona) {
        setPersona(response.persona);
        await chrome.runtime.sendMessage({
          type: 'SAVE_SETTINGS',
          payload: { persona: response.persona }
        });
      }
    } catch (e) {
      console.error('Failed to generate persona:', e);
    }
    setGeneratingPersona(false);
  };

  // Download persona
  const downloadPersona = () => {
    if (!persona) return;
    const filename = `Persona_${persona.firstName}_${persona.country}_${persona.city}.json`;
    const data = JSON.stringify(persona, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset persona
  const resetPersona = async () => {
    setPersona(null);
    setCountry('');
    setCity('');
    setCitySelectedFromAutocomplete(false);
    setCityConfirmed(false);
    setShowResetConfirm(false);
    await chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      payload: { persona: null }
    });
  };

  // Upload persona
  const uploadPersona = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.firstName && data.country && data.city) {
          setPersona(data);
          setCountry(data.country);
          setCity(data.city);
          await chrome.runtime.sendMessage({
            type: 'SAVE_SETTINGS',
            payload: { persona: data }
          });
        }
      } catch (e) {
        console.error('Failed to parse persona file:', e);
      }
    };
    reader.readAsText(file);
  };

  const handleStart = async () => {
    await chrome.runtime.sendMessage({ type: 'START' });
  };

  const handleStop = async () => {
    // Stop now just pauses - doesn't reset everything
    await chrome.runtime.sendMessage({ type: 'PAUSE' });
  };

  const handlePause = async () => {
    await chrome.runtime.sendMessage({ type: 'PAUSE' });
  };

  const handleResume = async () => {
    await chrome.runtime.sendMessage({ type: 'RESUME' });
  };

  const handleSaveSettings = async () => {
    await chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      payload: {
        openRouterApiKey: apiKey,
        model: selectedModel,
        agentEmail,
        agentEmailPassword
      }
    });
    setHasApiKey(!!apiKey);
    if (apiKey) {
      setShowSettings(false);
    }
  };

  // Credentials management
  const deleteCredential = async (credId: string) => {
    const updated = credentials.filter(c => c.id !== credId);
    setCredentials(updated);
    await chrome.storage.local.set({ autobrowser_credentials: updated });
    if (selectedCredId === credId) {
      setSelectedCredId(null);
    }
  };

  const downloadCredentials = () => {
    if (credentials.length === 0) return;
    const data = JSON.stringify(credentials, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autobrowser_credentials_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadCredentials = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          // Merge with existing credentials (replace duplicates by domain)
          const merged = [...credentials];
          for (const newCred of data) {
            if (newCred.domain && (newCred.email || newCred.username) && newCred.password) {
              const existingIdx = merged.findIndex(c => c.domain === newCred.domain);
              if (existingIdx >= 0) {
                merged[existingIdx] = newCred;
              } else {
                merged.push(newCred);
              }
            }
          }
          setCredentials(merged);
          await chrome.storage.local.set({ autobrowser_credentials: merged });
        }
      } catch (e) {
        console.error('Failed to parse credentials file:', e);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const selectedCredential = credentials.find(c => c.id === selectedCredId);

  const handleModelChange = async (newModel: string) => {
    setSelectedModel(newModel);
    await chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      payload: { model: newModel }
    });
    const modelName = models.find(m => m.id === newModel)?.name || newModel;
    setModelConfirm(modelName);
    setTimeout(() => setModelConfirm(''), 3000);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const canStart = hasApiKey && state.status === 'idle' && persona;
  const locationSet = country && city;

  // Group models by provider
  const groupedModels = models.reduce((acc, model) => {
    const provider = model.id.split('/')[0];
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(model);
    return acc;
  }, {} as Record<string, OpenRouterModel[]>);
  const sortedProviders = Object.keys(groupedModels).sort();

  return (
    <>
      <style>{styles}</style>
      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <h1>Autobrowser</h1>
            <div className={`status ${state.status}`}>
              {state.status === 'idle' && 'Ready to browse'}
              {state.status === 'running' && 'Browsing autonomously'}
              {state.status === 'paused' && 'Paused'}
            </div>
          </div>
          <button className="gear-btn" onClick={() => setShowSettings(true)} title="Settings">
            <GearIcon />
          </button>
        </div>

        {/* Controls + Stats in one line */}
        <div className="controls">
          {/* Play/Pause Button */}
          {state.status === 'idle' && (
            <button
              className="play-pause-btn"
              onClick={handleStart}
              disabled={!canStart}
              title="Start Browsing"
            >
              <PlayIcon />
            </button>
          )}
          {state.status === 'running' && (
            <button
              className="play-pause-btn"
              onClick={handlePause}
              title="Pause"
            >
              <PauseIcon />
            </button>
          )}
          {state.status === 'paused' && (
            <button
              className="play-pause-btn"
              onClick={handleResume}
              title="Resume"
            >
              <PlayIcon />
            </button>
          )}

          {/* Stats inline */}
          <div className="stats-inline">
            <div className="stat-inline">
              <div className="stat-inline-value">{state.totalActions}</div>
              <div className="stat-inline-label">Actions</div>
            </div>
            <div className="stat-inline">
              <div className="stat-inline-value">{state.errors}</div>
              <div className="stat-inline-label">Errors</div>
            </div>
          </div>
        </div>

        {/* Current Action */}
        <div className="current-action">
          <div className="current-action-label">Current Action</div>
          <div className="current-action-text">{state.currentAction || 'Idle'}</div>
        </div>

        {state.currentUrl && (
          <div className="url-box">
            <div className="current-action-label">Current URL</div>
            <div className="current-action-text">{state.currentUrl}</div>
          </div>
        )}

        {/* Persona Box */}
        <div className="persona-box">
          <div className="persona-header">
            <div className="persona-title">Browsing Persona</div>
            {persona && (
              <div className="persona-icons">
                <button onClick={downloadPersona} title="Download persona">
                  <DownloadIcon />
                </button>
                <button onClick={() => fileInputRef.current?.click()} title="Upload persona">
                  <UploadIcon />
                </button>
                <button onClick={() => setShowResetConfirm(true)} title="Create new persona">
                  <RefreshIcon />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".json"
                  onChange={uploadPersona}
                />
              </div>
            )}
          </div>

          {!persona ? (
            <>
              <div className="placeholder-bar short"></div>
              <div className="placeholder-bar medium"></div>
              <div className="placeholder-bar long" style={{ marginBottom: '16px' }}></div>

              <div className="location-row">
                <select
                  value={country}
                  onChange={(e) => { setCountry(e.target.value); setCity(''); setCityConfirmed(false); }}
                >
                  <option value="">Select country...</option>
                  {COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="location-row">
                <div className="city-wrapper">
                  <input
                    ref={cityInputRef}
                    type="text"
                    placeholder="Enter city..."
                    value={city}
                    disabled={!country}
                    onChange={(e) => handleCityInput(e.target.value)}
                    onBlur={() => { setTimeout(() => setShowCitySuggestions(false), 200); confirmCity(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmCity(); }}
                  />
                  <span className={`city-check ${cityConfirmed ? 'visible' : ''} ${cityCheckFading ? 'fade-out' : ''}`}>
                    <CheckIcon />
                  </span>
                  {showCitySuggestions && citySuggestions.length > 0 && (
                    <div className="city-suggestions">
                      {citySuggestions.map((s, i) => (
                        <div key={i} className="city-suggestion" onClick={() => selectCity(s)}>{s}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {locationSet && !generatingPersona && (
                <div className="generate-btn" onClick={generatePersona}>
                  <SparklesIcon />
                  <span>Generate browsing persona</span>
                </div>
              )}
              {generatingPersona && (
                <div style={{ fontSize: '14px', color: '#9A938B', marginTop: '12px' }}>
                  Generating persona...
                </div>
              )}
            </>
          ) : (
            <div className="persona-data">
              <div className="persona-name">{persona.firstName} {persona.lastName}, {persona.age}</div>
              <div className="persona-details">{persona.occupation}</div>
              <div className="persona-details">{persona.city}, {persona.country}</div>
              {persona.streetAddress && (
                <div className="persona-details" style={{ fontSize: '12px', color: '#9A938B' }}>
                  {persona.streetAddress}, {persona.state} {persona.zipCode}
                </div>
              )}
              <div className="persona-interests">
                <strong>Interests:</strong> {persona.interests.join(', ')}
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="section-title">Recent Activity</div>
        <div className="activities">
          {activities.length === 0 ? (
            <div className="empty-state">No activity yet</div>
          ) : (
            activities.map(activity => (
              <div className="activity" key={activity.id}>
                <span className={`activity-type ${activity.type}`}>{activity.type}</span>
                <span className="activity-time">{formatTime(activity.timestamp)}</span>
                <div className="activity-details">{activity.details.slice(0, 80)}</div>
              </div>
            ))
          )}
        </div>

        {/* Glassmorphism Overlay - No API Key */}
        {!hasApiKey && (
          <div className="glass-overlay">
            <div className="glass-card">
              <KeyIcon />
              <h2>API Key Required</h2>
              <p>
                To start autonomous browsing, please configure your OpenRouter API key in settings.
              </p>
              <button className="btn btn-primary" onClick={() => setShowSettings(true)}>
                Open Settings
              </button>
            </div>
          </div>
        )}

        {/* Reset Persona Confirmation Overlay */}
        {showResetConfirm && (
          <div className="glass-overlay" onClick={() => setShowResetConfirm(false)}>
            <div className="glass-card" onClick={e => e.stopPropagation()}>
              <RefreshIcon />
              <h2>Create New Persona?</h2>
              <p>
                Are you sure? This will delete the current persona.
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setShowResetConfirm(false)} style={{ flex: 1 }}>
                  No
                </button>
                <button className="btn btn-primary" onClick={resetPersona} style={{ flex: 1 }}>
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="modal-overlay" onClick={() => hasApiKey && setShowSettings(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Settings</h2>
                {hasApiKey && (
                  <button className="modal-close" onClick={() => setShowSettings(false)}>
                    <CloseIcon />
                  </button>
                )}
              </div>

              <div className="form-group">
                <label>OpenRouter API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-or-..."
                  autoFocus
                />
                <div className="hint">Get your key from openrouter.ai</div>
              </div>

              <div className="form-group">
                <label>Model</label>
                {!apiKey ? (
                  <select disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    <option>Enter API key first...</option>
                  </select>
                ) : loadingModels ? (
                  <div style={{ padding: '10px', color: '#9A938B', fontSize: '14px' }}>Loading models...</div>
                ) : models.length > 0 ? (
                  <select value={selectedModel} onChange={e => handleModelChange(e.target.value)}>
                    {sortedProviders.map(provider => (
                      <optgroup key={provider} label={provider.charAt(0).toUpperCase() + provider.slice(1)}>
                        {groupedModels[provider].map(model => (
                          <option key={model.id} value={model.id}>{model.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                ) : (
                  <select disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    <option>No models loaded</option>
                  </select>
                )}
                {modelConfirm && (
                  <div className="model-confirm">
                    <CheckIcon />
                    <span>{modelConfirm} activated</span>
                  </div>
                )}
              </div>

              {/* Agent Email for Signups */}
              <div className="email-section">
                <h4><EmailIcon /> Agent Email</h4>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <input
                    type="email"
                    value={agentEmail}
                    onChange={e => setAgentEmail(e.target.value)}
                    placeholder="agent@example.com"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <input
                    type="password"
                    value={agentEmailPassword}
                    onChange={e => setAgentEmailPassword(e.target.value)}
                    placeholder="Email password (for verification)"
                  />
                </div>
                <div className="hint" style={{ marginTop: '6px' }}>Email the agent will use to sign up for services</div>
              </div>

              {/* Website Credentials */}
              <div className="credentials-section">
                <div className="section-header">
                  <h3>Website Credentials</h3>
                  <div className="section-actions">
                    <button className="icon-btn" onClick={downloadCredentials} title="Download credentials" disabled={credentials.length === 0}>
                      <DownloadIcon />
                    </button>
                    <button className="icon-btn" onClick={() => credFileInputRef.current?.click()} title="Upload credentials">
                      <UploadIcon />
                    </button>
                    <input
                      type="file"
                      ref={credFileInputRef}
                      style={{ display: 'none' }}
                      accept=".json"
                      onChange={uploadCredentials}
                    />
                  </div>
                </div>

                {credentials.length === 0 ? (
                  <div className="no-creds">No saved credentials yet</div>
                ) : (
                  <>
                    <div className="cred-dropdown">
                      <button
                        className={`cred-dropdown-btn ${credDropdownOpen ? 'open' : ''}`}
                        onClick={() => setCredDropdownOpen(!credDropdownOpen)}
                      >
                        <span>{selectedCredential ? selectedCredential.domain : 'Select a website...'}</span>
                        <ChevronIcon open={credDropdownOpen} />
                      </button>
                      {credDropdownOpen && (
                        <div className="cred-dropdown-list">
                          {credentials.map(cred => (
                            <div
                              key={cred.id}
                              className={`cred-dropdown-item ${selectedCredId === cred.id ? 'selected' : ''}`}
                              onClick={() => { setSelectedCredId(cred.id); setCredDropdownOpen(false); }}
                            >
                              <span>{cred.domain}</span>
                              <button
                                className="cred-delete-btn"
                                onClick={(e) => { e.stopPropagation(); deleteCredential(cred.id); }}
                                title="Delete credential"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedCredential && (
                      <div className="cred-details">
                        {selectedCredential.email && (
                          <div className="cred-detail-row">
                            <span className="cred-detail-label">Email</span>
                            <span className="cred-detail-value">{selectedCredential.email}</span>
                          </div>
                        )}
                        {selectedCredential.username && (
                          <div className="cred-detail-row">
                            <span className="cred-detail-label">Username</span>
                            <span className="cred-detail-value">{selectedCredential.username}</span>
                          </div>
                        )}
                        <div className="cred-detail-row">
                          <span className="cred-detail-label">Password</span>
                          <span className="cred-detail-value">••••••••</span>
                        </div>
                        {selectedCredential.url && (
                          <div className="cred-detail-row">
                            <span className="cred-detail-label">URL</span>
                            <span className="cred-detail-value" style={{ fontSize: '11px' }}>{selectedCredential.url}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <button className="btn btn-primary" onClick={handleSaveSettings} style={{ width: '100%', marginTop: '16px' }}>
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<Sidebar />);
}
