'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Trash2, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ── Types ────────────────────────────────────────────────────────────────
export type LibraryFile = {
  id: string;
  projectId: string;
  filename: string;
  mediaType: string;
  sizeBytes: number;
  extractedText?: string | null;
  type: 'reference' | 'artifact' | 'weblink';
  url?: string | null;
  includeInContext: boolean;
  addedBy: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
};

// ── Raw SVGs from User ───────────────────────────────────────────────────

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 12.5625C6 12.8731 6.25185 13.125 6.5625 13.125C6.87315 13.125 7.125 12.8731 7.125 12.5625V7.125H12.5625C12.8731 7.125 13.125 6.87315 13.125 6.5625C13.125 6.25185 12.8731 6 12.5625 6H7.125V0.5625C7.125 0.251842 6.87315 0 6.5625 0C6.25185 0 6 0.251842 6 0.5625V6H0.5625C0.251842 6 0 6.25185 0 6.5625C0 6.87315 0.251842 7.125 0.5625 7.125H6V12.5625Z" fill="currentColor"/>
  </svg>
);

const GlobeIcon = ({ stroke = "currentColor" }: { stroke?: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.001 6.7505C13.001 10.2026 10.2026 13.001 6.7505 13.001M13.001 6.7505C13.001 3.29844 10.2026 0.5 6.7505 0.5M13.001 6.7505H0.5M6.7505 13.001C3.29844 13.001 0.5 10.2026 0.5 6.7505M6.7505 13.001C5.14552 11.3158 4.2503 9.07772 4.2503 6.7505C4.2503 4.42328 5.14552 2.18523 6.7505 0.5M6.7505 13.001C8.35548 11.3158 9.2507 9.07772 9.2507 6.7505C9.2507 4.42328 8.35548 2.18523 6.7505 0.5M6.7505 0.5C3.29844 0.5 0.5 3.29844 0.5 6.7505" stroke={stroke} strokeLinecap="round"/>
  </svg>
);

const PdfIcon = () => (
  <svg width="31" height="41" viewBox="0 0 31 41" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <path d="M29.9998 8.95719V37C29.9998 39.2091 28.209 41 25.9998 41H4C1.79086 41 0 39.2091 0 37V5C0 2.79086 1.79086 1 4 1H21.3367L29.9998 8.95719Z" fill="#F04438"/>
    <g filter="url(#filter0_d_695_2194)">
      <path d="M29.9991 8.95719H22.3359C21.7837 8.95719 21.3359 8.50947 21.3359 7.95719V1L29.9991 8.95719Z" fill="#FECDCA"/>
    </g>
    <path d="M11.8344 26.716C11.8344 27.082 11.7504 27.418 11.5824 27.724C11.4144 28.024 11.1564 28.267 10.8084 28.453C10.4604 28.639 10.0284 28.732 9.51243 28.732H8.55843V31H7.01943V24.682H9.51243C10.0164 24.682 10.4424 24.769 10.7904 24.943C11.1384 25.117 11.3994 25.357 11.5734 25.663C11.7474 25.969 11.8344 26.32 11.8344 26.716ZM9.39543 27.508C9.68943 27.508 9.90843 27.439 10.0524 27.301C10.1964 27.163 10.2684 26.968 10.2684 26.716C10.2684 26.464 10.1964 26.269 10.0524 26.131C9.90843 25.993 9.68943 25.924 9.39543 25.924H8.55843V27.508H9.39543ZM15.0026 24.682C15.6686 24.682 16.2506 24.814 16.7486 25.078C17.2466 25.342 17.6306 25.714 17.9006 26.194C18.1766 26.668 18.3146 27.217 18.3146 27.841C18.3146 28.459 18.1766 29.008 17.9006 29.488C17.6306 29.968 17.2436 30.34 16.7396 30.604C16.2416 30.868 15.6626 31 15.0026 31H12.6356V24.682H15.0026ZM14.9036 29.668C15.4856 29.668 15.9386 29.509 16.2626 29.191C16.5866 28.873 16.7486 28.423 16.7486 27.841C16.7486 27.259 16.5866 26.806 16.2626 26.482C15.9386 26.158 15.4856 25.996 14.9036 25.996H14.1746V29.668H14.9036ZM23.2877 24.682V25.915H20.7137V27.247H22.6397V28.444H20.7137V31H19.1747V24.682H23.2877Z" fill="white"/>
    <defs>
      <filter id="filter0_d_695_2194" x="18.3359" y="0" width="12.6641" height="11.957" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dx="-1" dy="1"/>
        <feGaussianBlur stdDeviation="1"/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_695_2194"/>
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_695_2194" result="shape"/>
      </filter>
    </defs>
  </svg>
);

const TxtIcon = () => (
  <svg width="31" height="41" viewBox="0 0 31 41" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <path d="M29.9998 8.95719V37C29.9998 39.2091 28.209 41 25.9998 41H4C1.79086 41 0 39.2091 0 37V5C0 2.79086 1.79086 1 4 1H21.3367L29.9998 8.95719Z" fill="#344054"/>
    <g filter="url(#filter_txt_fold)">
      <path d="M29.9991 8.95719H22.3359C21.7837 8.95719 21.3359 8.50947 21.3359 7.95719V1L29.9991 8.95719Z" fill="#E4E7EC"/>
    </g>
    <text fill="white" x="15" y="30.5" fontFamily="system-ui, -apple-system, sans-serif" fontSize="9" fontWeight="700" textAnchor="middle">TXT</text>
    <defs>
      <filter id="filter_txt_fold" x="18.3359" y="0" width="12.6641" height="11.957" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dx="-1" dy="1"/>
        <feGaussianBlur stdDeviation="1"/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
      </filter>
    </defs>
  </svg>
);


const MdIcon = () => (
  <svg width="31" height="41" viewBox="0 0 31 41" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <path d="M29.9998 8.95719V37C29.9998 39.2091 28.209 41 25.9998 41H4C1.79086 41 0 39.2091 0 37V5C0 2.79086 1.79086 1 4 1H21.3367L29.9998 8.95719Z" fill="#344054"/>
    <g filter="url(#filter0_d_695_2211)">
      <path d="M29.9991 8.95719H22.3359C21.7837 8.95719 21.3359 8.50947 21.3359 7.95719V1L29.9991 8.95719Z" fill="#E4E7EC"/>
    </g>
    <path d="M15.3126 24.682V31H13.7736V27.211L12.3606 31H11.1186L9.69661 27.202V31H8.15761V24.682H9.97561L11.7486 29.056L13.5036 24.682H15.3126ZM18.7863 24.682C19.4523 24.682 20.0343 24.814 20.5323 25.078C21.0303 25.342 21.4143 25.714 21.6843 26.194C21.9603 26.668 22.0983 27.217 22.0983 27.841C22.0983 28.459 21.9603 29.008 21.6843 29.488C21.4143 29.968 21.0273 30.34 20.5233 30.604C20.0253 30.868 19.4463 31 18.7863 31H16.4193V24.682H18.7863ZM18.6873 29.668C19.2693 29.668 19.7223 29.509 20.0463 29.191C20.3703 28.873 20.5323 28.423 20.5323 27.841C20.5323 27.259 20.3703 26.806 20.0463 26.482C19.7223 26.158 19.2693 25.996 18.6873 25.996H17.9583V29.668H18.6873Z" fill="white"/>
    <defs>
      <filter id="filter0_d_695_2211" x="18.3359" y="0" width="12.6641" height="11.957" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dx="-1" dy="1"/>
        <feGaussianBlur stdDeviation="1"/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_695_2211"/>
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_695_2211" result="shape"/>
      </filter>
    </defs>
  </svg>
);

const JpgIcon = () => (
  <svg width="31" height="41" viewBox="0 0 31 41" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <path d="M29.9998 8.95719V37C29.9998 39.2091 28.209 41 25.9998 41H4C1.79086 41 0 39.2091 0 37V5C0 2.79086 1.79086 1 4 1H21.3367L29.9998 8.95719Z" fill="#6172F3"/>
    <g filter="url(#filter0_d_695_2228)">
      <path d="M29.9991 8.95719H22.3359C21.7837 8.95719 21.3359 8.50947 21.3359 7.95719V1L29.9991 8.95719Z" fill="#C7D7FE"/>
    </g>
    <path d="M10.6806 24.682V28.984C10.6806 29.65 10.4916 30.163 10.1136 30.523C9.7416 30.883 9.2376 31.063 8.6016 31.063C7.9356 31.063 7.4016 30.874 6.9996 30.496C6.5976 30.118 6.3966 29.581 6.3966 28.885H7.9266C7.9266 29.149 7.9806 29.35 8.0886 29.488C8.1966 29.62 8.3526 29.686 8.5566 29.686C8.7426 29.686 8.8866 29.626 8.9886 29.506C9.0906 29.386 9.1416 29.212 9.1416 28.984V24.682H10.6806ZM16.7387 26.716C16.7387 27.082 16.6547 27.418 16.4867 27.724C16.3187 28.024 16.0607 28.267 15.7127 28.453C15.3647 28.639 14.9327 28.732 14.4167 28.732H13.4627V31H11.9237V24.682H14.4167C14.9207 24.682 15.3467 24.769 15.6947 24.943C16.0427 25.117 16.3037 25.357 16.4777 25.663C16.6517 25.969 16.7387 26.32 16.7387 26.716ZM14.2997 27.508C14.5937 27.508 14.8127 27.439 14.9567 27.301C15.1007 27.163 15.1727 26.968 15.1727 26.716C15.1727 26.464 15.1007 26.269 14.9567 26.131C14.8127 25.993 14.5937 25.924 14.2997 25.924H13.4627V27.508H14.2997ZM21.7339 26.68C21.6199 26.47 21.4549 26.311 21.2389 26.203C21.0289 26.089 20.7799 26.032 20.4919 26.032C19.9939 26.032 19.5949 26.197 19.2949 26.527C18.9949 26.851 18.8449 27.286 18.8449 27.832C18.8449 28.414 19.0009 28.87 19.3129 29.2C19.6309 29.524 20.0659 29.686 20.6179 29.686C20.9959 29.686 21.3139 29.59 21.5719 29.398C21.8359 29.206 22.0279 28.93 22.1479 28.57H20.1949V27.436H23.5429V28.867C23.4289 29.251 23.2339 29.608 22.9579 29.938C22.6879 30.268 22.3429 30.535 21.9229 30.739C21.5029 30.943 21.0289 31.045 20.5009 31.045C19.8769 31.045 19.3189 30.91 18.8269 30.64C18.3409 30.364 17.9599 29.983 17.6839 29.497C17.4139 29.011 17.2789 28.456 17.2789 27.832C17.2789 27.208 17.4139 26.653 17.6839 26.167C17.9599 25.675 18.3409 25.294 18.8269 25.024C19.3129 24.748 19.8679 24.61 20.4919 24.61C21.2479 24.61 21.8839 24.793 22.3999 25.159C22.9219 25.525 23.2669 26.032 23.4349 26.68H21.7339Z" fill="white"/>
    <defs>
      <filter id="filter0_d_695_2228" x="18.3359" y="0" width="12.6641" height="11.957" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dx="-1" dy="1"/>
        <feGaussianBlur stdDeviation="1"/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_695_2228"/>
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_695_2228" result="shape"/>
      </filter>
    </defs>
  </svg>
);

const XlsxIcon = () => (
  <svg width="31" height="41" viewBox="0 0 31 41" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <path d="M29.9998 8.95719V37C29.9998 39.2091 28.209 41 25.9998 41H4C1.79086 41 0 39.2091 0 37V5C0 2.79086 1.79086 1 4 1H21.3367L29.9998 8.95719Z" fill="#17B26A"/>
    <path d="M8.08132 31L6.79432 29.065L5.66032 31H3.91432L5.93932 27.787L3.86932 24.682H5.66032L6.92932 26.59L8.04532 24.682H9.79132L7.78432 27.868L9.87232 31H8.08132ZM12.1839 29.812H14.1999V31H10.6449V24.682H12.1839V29.812ZM17.22 31.063C16.758 31.063 16.344 30.988 15.978 30.838C15.612 30.688 15.318 30.466 15.096 30.172C14.88 29.878 14.766 29.524 14.754 29.11H16.392C16.416 29.344 16.497 29.524 16.635 29.65C16.773 29.77 16.953 29.83 17.175 29.83C17.403 29.83 17.583 29.779 17.715 29.677C17.847 29.569 17.913 29.422 17.913 29.236C17.913 29.08 17.859 28.951 17.751 28.849C17.649 28.747 17.52 28.663 17.364 28.597C17.214 28.531 16.998 28.456 16.716 28.372C16.308 28.246 15.975 28.12 15.717 27.994C15.459 27.868 15.237 27.682 15.051 27.436C14.865 27.19 14.772 26.869 14.772 26.473C14.772 25.885 14.985 25.426 15.411 25.096C15.837 24.76 16.392 24.592 17.076 24.592C17.772 24.592 18.333 24.76 18.759 25.096C19.185 25.426 19.413 25.888 19.443 26.482H17.778C17.766 26.278 17.691 26.119 17.553 26.005C17.415 25.885 17.238 25.825 17.022 25.825C16.836 25.825 16.686 25.876 16.572 25.978C16.458 26.074 16.401 26.215 16.401 26.401C16.401 26.605 16.497 26.764 16.689 26.878C16.881 26.992 17.181 27.115 17.589 27.247C17.997 27.385 18.327 27.517 18.579 27.643C18.837 27.769 19.059 27.952 19.245 28.192C19.431 28.432 19.524 28.741 19.524 29.119C19.524 29.479 19.431 29.806 19.245 30.1C19.065 30.394 18.801 30.628 18.453 30.802C18.105 30.976 17.694 31.063 17.22 31.063ZM24.3411 31L23.0541 29.065L21.9201 31H20.1741L22.1991 27.787L20.1291 24.682H21.9201L23.1891 26.59L24.3051 24.682H26.0511L24.0441 27.868L26.1321 31H24.3411Z" fill="white"/>
    <g filter="url(#filter0_d_695_2245)">
      <path d="M29.9991 8.95719H22.3359C21.7837 8.95719 21.3359 8.50947 21.3359 7.95719V1L29.9991 8.95719Z" fill="#ABEFC6"/>
    </g>
    <defs>
      <filter id="filter0_d_695_2245" x="18.3359" y="0" width="12.6641" height="11.957" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dx="-1" dy="1"/>
        <feGaussianBlur stdDeviation="1"/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_695_2245"/>
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_695_2245" result="shape"/>
      </filter>
    </defs>
  </svg>
);

const PptxIcon = () => (
  <svg width="31" height="41" viewBox="0 0 31 41" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <path d="M29.9998 8.95719V37C29.9998 39.2091 28.209 41 25.9998 41H4C1.79086 41 0 39.2091 0 37V5C0 2.79086 1.79086 1 4 1H21.3367L29.9998 8.95719Z" fill="#F97066"/>
    <g filter="url(#filter0_d_695_2262)">
      <path d="M29.9991 8.95719H22.3359C21.7837 8.95719 21.3359 8.50947 21.3359 7.95719V1L29.9991 8.95719Z" fill="#FECDCA"/>
    </g>
    <path d="M8.8813 26.716C8.8813 27.082 8.7973 27.418 8.6293 27.724C8.4613 28.024 8.2033 28.267 7.8553 28.453C7.5073 28.639 7.0753 28.732 6.5593 28.732H5.6053V31H4.0663V24.682H6.5593C7.0633 24.682 7.4893 24.769 7.8373 24.943C8.1853 25.117 8.4463 25.357 8.6203 25.663C8.7943 25.969 8.8813 26.32 8.8813 26.716ZM6.4423 27.508C6.7363 27.508 6.9553 27.439 7.0993 27.301C7.2433 27.163 7.3153 26.968 7.3153 26.716C7.3153 26.464 7.2433 26.269 7.0993 26.131C6.9553 25.993 6.7363 25.924 6.4423 25.924H5.6053V27.508H6.4423ZM14.4975 26.716C14.4975 27.082 14.4135 27.418 14.2455 27.724C14.0775 28.024 13.8195 28.267 13.4715 28.453C13.1235 28.639 12.6915 28.732 12.1755 28.732H11.2215V31H9.68251V24.682H12.1755C12.6795 24.682 13.1055 24.769 13.4535 24.943C13.8015 25.117 14.0625 25.357 14.2365 25.663C14.4105 25.969 14.4975 26.32 14.4975 26.716ZM12.0585 27.508C12.3525 27.508 12.5715 27.439 12.7155 27.301C12.8595 27.163 12.9315 26.968 12.9315 26.716C12.9315 26.464 12.8595 26.269 12.7155 26.131C12.5715 25.993 12.3525 25.924 12.0585 25.924H11.2215V27.508H12.0585ZM19.8437 24.682V25.915H18.1697V31H16.6307V25.915H14.9567V24.682H19.8437ZM24.4861 31L23.1991 29.065L22.0651 31H20.3191L22.3441 27.787L20.2741 24.682H22.0651L23.3341 26.59L24.4501 24.682H26.1961L24.1891 27.868L26.2771 31H24.4861Z" fill="white"/>
    <defs>
      <filter id="filter0_d_695_2262" x="18.3359" y="0" width="12.6641" height="11.957" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dx="-1" dy="1"/>
        <feGaussianBlur stdDeviation="1"/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_695_2262"/>
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_695_2262" result="shape"/>
      </filter>
    </defs>
  </svg>
);

const DocxIcon = () => (
  // To match the aesthetic of the others, we wrap the Docx text inside a similar box,
  // but since user provided a specific SVG for DOCX text, we just put it in a generic box or just use what they gave.
  // The user provided <svg width="30" height="12" ... > for DOCX. It seems to just be the text "DOCX". Let's put it on a generic file shape to match.
  <svg width="31" height="41" viewBox="0 0 31 41" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <path d="M29.9998 8.95719V37C29.9998 39.2091 28.209 41 25.9998 41H4C1.79086 41 0 39.2091 0 37V5C0 2.79086 1.79086 1 4 1H21.3367L29.9998 8.95719Z" fill="#1570EF"/>
    <g filter="url(#filter0_d_695_docx)">
      <path d="M29.9991 8.95719H22.3359C21.7837 8.95719 21.3359 8.50947 21.3359 7.95719V1L29.9991 8.95719Z" fill="#D1E9FF"/>
    </g>
    {/* Scaled/Translated DOCX SVG contents into the file shape */}
    <g transform="translate(0, 21)">
      <path d="M4.47334 2.682C5.13934 2.682 5.72134 2.814 6.21934 3.078C6.71734 3.342 7.10134 3.714 7.37134 4.194C7.64734 4.668 7.78534 5.217 7.78534 5.841C7.78534 6.459 7.64734 7.008 7.37134 7.488C7.10134 7.968 6.71434 8.34 6.21034 8.604C5.71234 8.868 5.13334 9 4.47334 9H2.10634V2.682H4.47334ZM4.37434 7.668C4.95634 7.668 5.40934 7.509 5.73334 7.191C6.05734 6.873 6.21934 6.423 6.21934 5.841C6.21934 5.259 6.05734 4.806 5.73334 4.482C5.40934 4.158 4.95634 3.996 4.37434 3.996H3.64534V7.668H4.37434ZM11.6334 9.063C11.0394 9.063 10.4934 8.925 9.9954 8.649C9.5034 8.373 9.1104 7.989 8.8164 7.497C8.5284 6.999 8.3844 6.441 8.3844 5.823C8.3844 5.205 8.5284 4.65 8.8164 4.158C9.1104 3.666 9.5034 3.282 9.9954 3.006C10.4934 2.73 11.0394 2.592 11.6334 2.592C12.2274 2.592 12.7704 2.73 13.2624 3.006C13.7604 3.282 14.1504 3.666 14.4324 4.158C14.7204 4.65 14.8644 5.205 14.8644 5.823C14.8644 6.441 14.7204 6.999 14.4324 7.497C14.1444 7.989 13.7544 8.373 13.2624 8.649C12.7704 8.925 12.2274 9.063 11.6334 9.063ZM11.6334 7.659C12.1374 7.659 12.5394 7.491 12.8394 7.155C13.1454 6.819 13.2984 6.375 13.2984 5.823C13.2984 5.265 13.1454 4.821 12.8394 4.491C12.5394 4.155 12.1374 3.987 11.6334 3.987C11.1234 3.987 10.7154 4.152 10.4094 4.482C10.1094 4.812 9.9594 5.259 9.9594 5.823C9.9594 6.381 10.1094 6.828 10.4094 7.164C10.7154 7.494 11.1234 7.659 11.6334 7.659ZM15.4596 5.832C15.4596 5.208 15.5946 4.653 15.8646 4.167C16.1346 3.675 16.5096 3.294 16.9896 3.024C17.4756 2.748 18.0246 2.61 18.6366 2.61C19.3866 2.61 20.0286 2.808 20.5626 3.204C21.0966 3.6 21.4536 4.14 21.6336 4.824H19.9416C19.8156 4.56 19.6356 4.359 19.4016 4.221C19.1736 4.083 18.9126 4.014 18.6186 4.014C18.1446 4.014 17.7606 4.179 17.4666 4.509C17.1726 4.839 17.0256 5.28 17.0256 5.832C17.0256 6.384 17.1726 6.825 17.4666 7.155C17.7606 7.485 18.1446 7.65 18.6186 7.65C18.9126 7.65 19.1736 7.581 19.4016 7.443C19.6356 7.305 19.8156 7.104 19.9416 6.84H21.6336C21.4536 7.524 21.0966 8.064 20.5626 8.46C20.0286 8.85 19.3866 9.045 18.6366 9.045C18.0246 9.045 17.4756 8.91 16.9896 8.64C16.5096 8.364 16.1346 7.983 15.8646 7.497C15.5946 7.011 15.4596 6.456 15.4596 5.832ZM26.4461 9L25.1591 7.065L24.0251 9H22.2791L24.3041 5.787L22.2341 2.682H24.0251L25.2941 4.59L26.4101 2.682H28.1561L26.1491 5.868L28.2371 9H26.4461Z" fill="white"/>
    </g>
    <defs>
      <filter id="filter0_d_695_docx" x="18.3359" y="0" width="12.6641" height="11.957" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dx="-1" dy="1"/>
        <feGaussianBlur stdDeviation="1"/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_695_docx"/>
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_695_docx" result="shape"/>
      </filter>
    </defs>
  </svg>
);

const WeblinkIcon = () => (
  <svg width="31" height="41" viewBox="0 0 31 41" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <path d="M29.9998 8.95719V37C29.9998 39.2091 28.209 41 25.9998 41H4C1.79086 41 0 39.2091 0 37V5C0 2.79086 1.79086 1 4 1H21.3367L29.9998 8.95719Z" fill="#8B5CF6"/>
    <g filter="url(#filter0_d_695_2296)">
      <path d="M29.9991 8.95719H22.3359C21.7837 8.95719 21.3359 8.50947 21.3359 7.95719V1L29.9991 8.95719Z" fill="#E4E7EC"/>
    </g>
    <path d="M14.1182 24.682L12.4712 31H10.6082L9.60021 26.842L8.55621 31H6.69321L5.09121 24.682H6.73821L7.64721 29.281L8.77221 24.682H10.4642L11.5442 29.281L12.4622 24.682H14.1182ZM16.429 25.915V27.193H18.49V28.381H16.429V29.767H18.76V31H14.89V24.682H18.76V25.915H16.429ZM23.5842 27.76C23.9502 27.838 24.2442 28.021 24.4662 28.309C24.6882 28.591 24.7992 28.915 24.7992 29.281C24.7992 29.809 24.6132 30.229 24.2412 30.541C23.8752 30.847 23.3622 31 22.7022 31H19.7592V24.682H22.6032C23.2452 24.682 23.7462 24.829 24.1062 25.123C24.4722 25.417 24.6552 25.816 24.6552 26.32C24.6552 26.692 24.5562 27.001 24.3582 27.247C24.1662 27.493 23.9082 27.664 23.5842 27.76ZM21.2982 27.238H22.3062C22.5582 27.238 22.7502 27.184 22.8822 27.076C23.0202 26.962 23.0892 26.797 23.0892 26.581C23.0892 26.365 23.0202 26.2 22.8822 26.086C22.7502 25.972 22.5582 25.915 22.3062 25.915H21.2982V27.238ZM22.4322 29.758C22.6902 29.758 22.8882 29.701 23.0262 29.587C23.1702 29.467 23.2422 29.296 23.2422 29.074C23.2422 28.852 23.1672 28.678 23.0172 28.552C22.8732 28.426 22.6722 28.363 22.4142 28.363H21.2982V29.758H22.4322Z" fill="white"/>
    <defs>
      <filter id="filter0_d_695_2296" x="18.3359" y="0" width="12.6641" height="11.957" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dx="-1" dy="1"/>
        <feGaussianBlur stdDeviation="1"/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_695_2296"/>
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_695_2296" result="shape"/>
      </filter>
    </defs>
  </svg>
);

const UnknownDocIcon = () => (
  // Fallback icon for unknown file types
  <svg width="31" height="41" viewBox="0 0 31 41" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <path d="M29.9998 8.95719V37C29.9998 39.2091 28.209 41 25.9998 41H4C1.79086 41 0 39.2091 0 37V5C0 2.79086 1.79086 1 4 1H21.3367L29.9998 8.95719Z" fill="#98A2B3"/>
    <g filter="url(#filter0_d_unknown)">
      <path d="M29.9991 8.95719H22.3359C21.7837 8.95719 21.3359 8.50947 21.3359 7.95719V1L29.9991 8.95719Z" fill="#EAECF0"/>
    </g>
    <defs>
      <filter id="filter0_d_unknown" x="18.3359" y="0" width="12.6641" height="11.957" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dx="-1" dy="1"/>
        <feGaussianBlur stdDeviation="1"/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_unknown"/>
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_unknown" result="shape"/>
      </filter>
    </defs>
  </svg>
);

// ── Components ───────────────────────────────────────────────────────────

// ── Upload Limits ────────────────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILE_SIZE_LABEL = '10 MB';
const MAX_LIBRARY_FILES = 30;

// ── Cloud Upload Icon ────────────────────────────────────────────────────
const CloudUploadIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <path d="M20 26.667V13.333M20 13.333L14.167 19.167M20 13.333L25.833 19.167" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 28.333C6.318 28.333 3.333 25.349 3.333 21.667C3.333 18.414 5.651 15.71 8.72 15.1C8.398 14.164 8.333 13.149 8.333 12.5C8.333 8.358 11.691 5 15.833 5C18.934 5 21.583 6.877 22.72 9.533C23.504 9.026 24.433 8.733 25.433 8.733C28.194 8.733 30.433 10.972 30.433 13.733C30.433 14.131 30.389 14.52 30.305 14.893C33.587 15.48 36.1 18.346 36.1 21.833C36.1 25.824 32.924 29.067 29 29.067" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function LibraryTab({
  projectId,
  initialFiles,
}: {
  projectId: string;
  initialFiles: LibraryFile[];
}) {
  const [files, setFiles] = useState<LibraryFile[]>(initialFiles);
  const [activeSubTab, setActiveSubTab] = useState<'reference' | 'artifact'>('reference');
  const [isUploading, setIsUploading] = useState(false);
  
  // Weblink Modal State
  const [isWebModalOpen, setIsWebModalOpen] = useState(false);
  const [webUrl, setWebUrl] = useState('');
  const [isUrlFocused, setIsUrlFocused] = useState(false); // Used for Gradient Border Trick

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch fresh data on mount to ensure we don't show stale initialFiles
  useEffect(() => {
    fetch(`/api/projects/${projectId}/libraries`)
      .then((res) => res.json())
      .then((data) => {
        if (data.files) setFiles(data.files);
      })
      .catch((err) => console.error('Failed to refresh library:', err));
  }, [projectId]);

  // ── File Validation & Upload ──────────────────────────────────────────

  const validateAndUploadFiles = async (selectedFiles: File[]) => {
    const errors: string[] = [];

    // Check file count cap
    const slotsRemaining = MAX_LIBRARY_FILES - files.length;
    if (slotsRemaining <= 0) {
      errors.push(`Library is full (${MAX_LIBRARY_FILES} files max). Delete files to make room.`);
      setUploadErrors(errors);
      return;
    }

    // Filter out oversized files and track errors
    const validFiles: File[] = [];
    for (const file of selectedFiles) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`"${file.name}" exceeds the ${MAX_FILE_SIZE_LABEL} limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      } else {
        validFiles.push(file);
      }
    }

    // Cap at remaining slots
    const filesToUpload = validFiles.slice(0, slotsRemaining);
    if (validFiles.length > slotsRemaining) {
      errors.push(`Only ${slotsRemaining} slot(s) remaining. ${validFiles.length - slotsRemaining} file(s) skipped.`);
    }

    if (errors.length > 0) setUploadErrors(errors);
    if (filesToUpload.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'reference');
        formData.append('addedBy', 'User');

        const res = await fetch(`/api/projects/${projectId}/libraries`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.id) {
          setFiles((prev) => [data, ...prev]);
        } else if (!res.ok) {
          setUploadErrors((prev) => [...prev, `Failed to upload "${file.name}": ${data.error || 'Unknown error'}`]);
        }
      }
    } catch (err) {
      console.error('Failed to upload file:', err);
    } finally {
      setIsUploading(false);
      if (filesToUpload.length > 0 && uploadErrors.length === 0) {
        setIsUploadModalOpen(false);
      }
    }
  };

  // Legacy handler for the hidden <input> (triggered by "click to browse")
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await validateAndUploadFiles(Array.from(e.target.files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await validateAndUploadFiles(Array.from(e.dataTransfer.files));
    }
  };


  const handleAddWeblink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webUrl.trim()) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/libraries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: new URL(webUrl).hostname, // Automatically label by hostname
          url: webUrl.trim(),
          type: 'weblink',
          addedBy: 'User',
          includeInContext: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFiles((prev) => [data, ...prev]);
        setIsWebModalOpen(false);
        setWebUrl('');
      }
    } catch (err) {
      console.error('Failed to add web link:', err);
    }
  };

  // Optimistic context toggle: update state immediately, then fetch in the background.
  // Explanation (Learning & Building):
  // We use functional state update `setFiles(prev => prev.map(...))` to instantly reflect the UI change.
  // Then we perform the `fetch` asynchronously. If `fetch` fails, we could revert, but as a fire-and-forget,
  // we ensure React state isn't overwritten by the potentially malformed `{ok: true}` response.
  // This directly addresses the historical "React State Corruption on PATCH" bug.
  const handleToggleContext = async (file: LibraryFile) => {
    const updatedVal = !file.includeInContext;
    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, includeInContext: updatedVal } : f))
    );

    try {
      await fetch(`/api/projects/${projectId}/libraries/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeInContext: updatedVal }),
      });
    } catch (err) {
      console.error('Failed to update context inclusion:', err);
      // Optional: revert state here if needed
    }
  };

  const handleDelete = async (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    try {
      await fetch(`/api/projects/${projectId}/libraries/${fileId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  // ── Render Helpers ──────────────────────────────────────────────

  const displayedFiles = files.filter((f) =>
    activeSubTab === 'reference'
      ? f.type === 'reference' || f.type === 'weblink'
      : f.type === 'artifact'
  );

  const getFileIcon = (file: LibraryFile) => {
    if (file.type === 'weblink') return <WeblinkIcon />;
    const name = file.filename.toLowerCase();
    if (name.endsWith('.pdf')) return <PdfIcon />;
    if (name.endsWith('.md')) return <MdIcon />;
    if (name.endsWith('.txt')) return <TxtIcon />;
    if (name.endsWith('.jpg') || name.endsWith('.png') || name.endsWith('.jpeg')) return <JpgIcon />;
    if (name.endsWith('.xlsx') || name.endsWith('.csv')) return <XlsxIcon />;
    if (name.endsWith('.pptx')) return <PptxIcon />;
    if (name.endsWith('.docx') || name.endsWith('.doc')) return <DocxIcon />;
    return <UnknownDocIcon />;
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateValue: string | Date) => {
    const d = new Date(dateValue);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(2);
    return `${day}/${month}/${year}`; // Output: 14/06/24
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-[17px] flex flex-col items-start relative size-full">
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 flex items-center justify-between pb-[20px] pt-[40px] px-[24px] w-full shrink-0 rounded-t-[17px]">
        <div className="flex flex-col gap-[6px] items-start shrink-0">
          <p className="font-['Inter'] font-bold text-[#111827] dark:text-white text-[20px] m-0">
            Project Library
          </p>
          <p className="hidden xl:block font-['Inter'] font-normal text-[#4b5563] dark:text-neutral-400 text-[14px] m-0 whitespace-nowrap">
            Organize, add and include files and photos to chat
          </p>
        </div>

        {/* Action Buttons */}
        <button
          onClick={() => { setUploadErrors([]); setIsUploadModalOpen(true); }}
          disabled={isUploading}
          className="bg-[#1a1a1a] dark:bg-[#1a1a1a] border border-[#2e2e2e] dark:border-[#2e2e2e] border-solid flex gap-[7px] h-[37px] items-center justify-center px-[16px] py-[10px] rounded-[8px] shrink-0 hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="w-[16px] h-[16px] text-white animate-spin" />
          ) : (
            <div className="relative shrink-0 w-[16px] h-[16px] flex items-center justify-center text-white">
              <PlusIcon />
            </div>
          )}
          <p className="font-['Inter'] font-medium text-[14px] text-white whitespace-nowrap m-0">
            Upload
          </p>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col gap-[12px] items-start pb-[40px] pt-[12px] px-[24px] w-full shrink-0 flex-1 min-h-0">
        
        {/* Sub-Tabs (Segmented Toggle - Figma 695:2178) */}
        {files.length > 0 && (
          <div className="flex items-center justify-start w-full shrink-0 pb-[4px]">
            <div className="bg-[#f8f2f4] dark:bg-neutral-800 flex gap-[2px] items-center p-[3px] rounded-[9px] w-fit">
              <button
                onClick={() => setActiveSubTab('reference')}
                className={`flex items-center justify-center px-[14px] py-[5px] rounded-[7px] transition-all ${
                  activeSubTab === 'reference'
                    ? 'bg-white dark:bg-neutral-700 drop-shadow-[0px_1px_1.5px_rgba(0,0,0,0.12)]'
                    : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <p className={`font-['Inter'] text-[12px] m-0 ${
                  activeSubTab === 'reference'
                    ? 'font-medium text-black dark:text-white'
                    : 'font-normal text-[#666666] dark:text-neutral-400'
                }`}>
                  Library
                </p>
              </button>
              <button
                onClick={() => setActiveSubTab('artifact')}
                className={`flex items-center justify-center px-[14px] py-[5px] rounded-[7px] transition-all ${
                  activeSubTab === 'artifact'
                    ? 'bg-white dark:bg-neutral-700 drop-shadow-[0px_1px_1.5px_rgba(0,0,0,0.12)]'
                    : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <p className={`font-['Inter'] text-[12px] m-0 ${
                  activeSubTab === 'artifact'
                    ? 'font-medium text-black dark:text-white'
                    : 'font-normal text-[#666666] dark:text-neutral-400'
                }`}>
                  Artifacts
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {displayedFiles.length === 0 ? (
          <div className="flex flex-[1_0_0] flex-col items-center justify-center min-h-[400px] px-[24px] py-[80px] w-full">
            <div className="flex flex-col gap-[8px] items-center text-center w-[420px]">
              <p className="font-['Inter'] font-semibold text-[#111827] dark:text-white text-[18px] m-0">
                {files.length === 0 ? "No documents uploaded" : "No files here"}
              </p>
              <p className="font-['Inter'] font-normal leading-[1.5] text-[#4b5563] dark:text-neutral-400 text-[14px] m-0">
                {files.length === 0 
                  ? "Upload files or photos to use as context"
                  : "Switch tabs or upload new files to see them here"}
              </p>
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="flex flex-col w-full flex-1 min-h-0">
            {/* Table Header */}
            <div className="flex items-center px-[16px] py-[12px] border-b border-[#e5e7eb] dark:border-neutral-800 w-full shrink-0">
              {activeSubTab === 'reference' && (
                <div className="w-[32px] shrink-0" />
              )}
              <div className="flex-1 min-w-0 font-['Inter'] text-[12px] font-medium text-[#6b7280] dark:text-neutral-400">
                File Name
              </div>
              <div className="w-[100px] shrink-0 font-['Inter'] text-[12px] font-medium text-[#6b7280] dark:text-neutral-400 text-right">
                Upload Date
              </div>
              <div className="w-[120px] shrink-0 font-['Inter'] text-[12px] font-medium text-[#6b7280] dark:text-neutral-400 text-right pr-[24px]">
                Added By
              </div>
              <div className="w-[32px] shrink-0" />
            </div>

            {/* Rows */}
            <div className="flex flex-col w-full overflow-y-auto no-scrollbar">
              {displayedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center px-[16px] py-[16px] border-b border-[#e5e7eb] dark:border-neutral-800 hover:bg-[#f9fafb] dark:hover:bg-neutral-800/50 transition-colors group shrink-0"
                >
                  {/* Context Checkbox (Only on Reference SubTab) */}
                  {activeSubTab === 'reference' && (
                    <div className="w-[32px] shrink-0 flex items-center">
                      <input
                        type="checkbox"
                        checked={file.includeInContext}
                        onChange={() => handleToggleContext(file)}
                        className="w-[16px] h-[16px] rounded-[4px] border-[#d1d5db] dark:border-neutral-600 text-[#111827] focus:ring-[#111827] dark:focus:ring-white cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="flex flex-1 items-center gap-[12px] min-w-0">
                    {getFileIcon(file)}
                    <div className="flex flex-col min-w-0 gap-[2px]">
                      <div className="flex items-center gap-[6px] min-w-0">
                        <span className="font-['Inter'] text-[14px] font-medium text-[#111827] dark:text-neutral-100 truncate leading-snug">
                          {file.filename}
                        </span>
                        {file.type === 'weblink' && file.url && (
                          <a href={file.url} target="_blank" rel="noreferrer" className="shrink-0 text-[#9ca3af] hover:text-[#111827] dark:hover:text-white transition-colors">
                            <ExternalLink className="w-[14px] h-[14px]" />
                          </a>
                        )}
                      </div>
                      {file.type !== 'weblink' && (
                        <span className="font-['Inter'] text-[12px] font-normal text-[#6b7280] dark:text-neutral-400 leading-snug">
                          {formatSize(file.sizeBytes)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-[100px] shrink-0 font-['Inter'] text-[13px] font-normal text-[#6b7280] dark:text-neutral-400 text-right">
                    {formatDate(file.createdAt)}
                  </div>

                  <div className="w-[120px] shrink-0 flex items-center justify-end gap-[8px] pr-[24px]">
                    <div className="w-[20px] h-[20px] rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                      <span className="text-[10px] text-white font-medium">
                        {file.addedBy.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-['Inter'] text-[13px] font-normal text-[#111827] dark:text-neutral-100 truncate max-w-[70px]">
                      {file.addedBy}
                    </span>
                  </div>

                  <div className="w-[32px] shrink-0 flex justify-end">
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-[6px] rounded-[6px] text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-neutral-700 hover:text-[#ef4444]"
                    >
                      <Trash2 className="w-[16px] h-[16px]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Upload Documents Modal ──────────────────────────── */}
      <Dialog open={isUploadModalOpen} onOpenChange={(open) => { setIsUploadModalOpen(open); if (!open) setUploadErrors([]); }}>
        <DialogContent className="max-w-[520px] p-[24px] bg-white dark:bg-neutral-900 rounded-[16px] border border-[#e5e7eb] dark:border-neutral-800 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] outline-none sm:rounded-[16px] gap-0">
          <div className="flex flex-col gap-[24px]">
            <DialogTitle className="font-['Inter'] text-[18px] font-semibold text-[#111827] dark:text-neutral-100 m-0">
              Upload Documents
            </DialogTitle>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-[12px] py-[40px] px-[24px] rounded-[12px] border-[1.5px] border-dashed cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-[#57C4E5] bg-[#f0fafe] dark:bg-[#57C4E5]/10'
                  : 'border-[#d1d5db] dark:border-neutral-700 bg-[#fafafa] dark:bg-neutral-800/50 hover:bg-[#f3f4f6] dark:hover:bg-neutral-800'
              }`}
            >
              <CloudUploadIcon />
              <p className="font-['Inter'] text-[14px] font-normal text-[#6b7280] dark:text-neutral-400 text-center m-0">
                Drop your files here, or{' '}
                <span className="text-[#3b82f6] font-medium cursor-pointer">click to browse</span>
              </p>
              <p className="font-['Inter'] text-[12px] font-normal text-[#9ca3af] dark:text-neutral-500 text-center m-0">
                Up to {MAX_LIBRARY_FILES} files, {MAX_FILE_SIZE_LABEL} per file
              </p>
            </div>

            {/* Upload Errors */}
            {uploadErrors.length > 0 && (
              <div className="flex flex-col gap-[6px] p-[12px] rounded-[8px] bg-[#fef2f2] dark:bg-red-900/20 border border-[#fecaca] dark:border-red-800">
                {uploadErrors.map((err, i) => (
                  <p key={i} className="font-['Inter'] text-[12px] font-normal text-[#dc2626] dark:text-red-400 m-0">
                    {err}
                  </p>
                ))}
              </div>
            )}

            {/* Uploading indicator */}
            {isUploading && (
              <div className="flex items-center gap-[8px] justify-center py-[8px]">
                <Loader2 className="w-[16px] h-[16px] text-[#111827] dark:text-white animate-spin" />
                <p className="font-['Inter'] text-[13px] font-medium text-[#111827] dark:text-neutral-100 m-0">
                  Uploading...
                </p>
              </div>
            )}

            {/* File count indicator */}
            <p className="font-['Inter'] text-[12px] font-normal text-[#9ca3af] dark:text-neutral-500 text-right m-0">
              {files.length} / {MAX_LIBRARY_FILES} files used
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Weblink Modal ──────────────────────────── */}
      <Dialog open={isWebModalOpen} onOpenChange={setIsWebModalOpen}>
        <DialogContent className="max-w-[420px] p-[24px] bg-white dark:bg-neutral-900 rounded-[16px] border border-[#e5e7eb] dark:border-neutral-800 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] outline-none sm:rounded-[16px] gap-0">
          <div className="flex flex-col gap-[24px]">
            <div className="flex flex-col gap-[8px]">
              <DialogTitle className="font-['Inter'] text-[18px] font-semibold text-[#111827] dark:text-neutral-100 m-0">
                Add Webpage
              </DialogTitle>
              <p className="font-['Inter'] text-[13px] font-normal text-[#4b5563] dark:text-neutral-400 m-0">
                Paste a link to any webpage to add its content to the project library.
              </p>
            </div>

            <form onSubmit={handleAddWeblink} className="flex flex-col gap-[20px]">
              <div 
                className={`relative flex items-center rounded-[10px] transition-all ${
                  isUrlFocused 
                    ? 'p-[0.75px] bg-gradient-to-br from-[#EE6055] to-[#57C4E5]' 
                    : 'p-[1px] bg-[#e5e7eb] dark:bg-neutral-700'
                }`}
              >
                <div className="flex items-center w-full h-[44px] bg-white dark:bg-neutral-900 rounded-[9px] px-[12px] gap-[10px]">
                  <GlobeIcon stroke="#9ca3af" />
                  <input
                    type="url"
                    required
                    value={webUrl}
                    onChange={(e) => setWebUrl(e.target.value)}
                    onFocus={() => setIsUrlFocused(true)}
                    onBlur={() => setIsUrlFocused(false)}
                    placeholder="https://"
                    className="flex-1 font-['Inter'] bg-transparent text-[14px] text-[#111827] dark:text-neutral-100 placeholder-[#9ca3af] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={!webUrl.trim()}
                  className="flex items-center justify-center bg-[#111827] hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black h-[40px] px-[16px] rounded-[8px] font-['Inter'] text-[14px] font-medium transition-colors disabled:opacity-50"
                >
                  Add page
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
