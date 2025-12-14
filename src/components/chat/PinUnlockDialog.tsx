import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

interface PinUnlockDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUnlock: () => void;
    correctPin: string;
    characterName: string;
}

export const PinUnlockDialog = ({
    open,
    onOpenChange,
    onUnlock,
    correctPin,
    characterName,
}: PinUnlockDialogProps) => {
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === correctPin) {
            setPin("");
            setError("");
            onUnlock();
            onOpenChange(false);
        } else {
            setError("Incorrect PIN");
            setPin("");
        }
    };

    const handleClose = () => {
        setPin("");
        setError("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[300px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Chat Locked
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-4">
                            Enter PIN to unlock chat with <strong>{characterName}</strong>
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="unlock-pin" className="sr-only">PIN</Label>
                        <Input
                            id="unlock-pin"
                            type="password"
                            placeholder="Enter 4-digit PIN"
                            maxLength={4}
                            value={pin}
                            onChange={(e) => {
                                setPin(e.target.value.replace(/\D/g, ''));
                                setError("");
                            }}
                            className="text-center text-2xl tracking-widest"
                            autoFocus
                        />
                        {error && (
                            <p className="text-xs text-destructive text-center">{error}</p>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={handleClose}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1" disabled={pin.length !== 4}>
                            Unlock
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
