"use client";

import { ContactList, ContactUpload, ContactAdd } from "@/components/contacts";

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your contact database for outbound campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ContactAdd />
          <ContactUpload />
        </div>
      </div>

      {/* Contacts List */}
      <ContactList />
    </div>
  );
}
