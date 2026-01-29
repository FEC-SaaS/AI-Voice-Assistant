"use client";

import { ContactList, ContactUpload } from "@/components/contacts";

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500">
            Manage your contact database for outbound campaigns
          </p>
        </div>
        <ContactUpload />
      </div>

      {/* Contacts List */}
      <ContactList />
    </div>
  );
}
