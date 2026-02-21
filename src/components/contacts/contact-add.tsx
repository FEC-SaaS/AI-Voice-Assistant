"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ContactAddProps {
  campaignId?: string;
  onSuccess?: () => void;
}

const emptyForm = {
  phoneNumber: "",
  firstName: "",
  lastName: "",
  email: "",
  company: "",
};

export function ContactAdd({ campaignId, onSuccess }: ContactAddProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const createContact = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success("Contact added successfully");
      handleClose();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleClose = () => {
    setIsOpen(false);
    setForm(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phoneNumber.trim()) {
      toast.error("Phone number is required");
      return;
    }
    createContact.mutate({
      phoneNumber: form.phoneNumber,
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      email: form.email || undefined,
      company: form.company || undefined,
      campaignId,
    });
  };

  const handleChange =
    (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        Add Contact
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>
              Manually add a single contact to your database.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="add-phone">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-phone"
                placeholder="+12125550198"
                value={form.phoneNumber}
                onChange={handleChange("phoneNumber")}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                US numbers (10 digits) are auto-formatted. Include + for international.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="add-firstName">First Name</Label>
                <Input
                  id="add-firstName"
                  placeholder="John"
                  value={form.firstName}
                  onChange={handleChange("firstName")}
                />
              </div>
              <div>
                <Label htmlFor="add-lastName">Last Name</Label>
                <Input
                  id="add-lastName"
                  placeholder="Smith"
                  value={form.lastName}
                  onChange={handleChange("lastName")}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={handleChange("email")}
              />
            </div>

            <div>
              <Label htmlFor="add-company">Company</Label>
              <Input
                id="add-company"
                placeholder="Acme Corp"
                value={form.company}
                onChange={handleChange("company")}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createContact.isPending}>
                {createContact.isPending ? "Adding..." : "Add Contact"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
