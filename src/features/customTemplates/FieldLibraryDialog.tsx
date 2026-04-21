/**
 * Field library dialog — browse saved blocks (groups of reusable fields)
 * and save the current selection as a new block.
 */
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Library, PackagePlus } from "lucide-react";
import {
  parseTemplateFields,
  stringifyTemplateFields,
  type TemplateField,
} from "../../../convex/lib/customTemplates";
import { freshFieldId } from "./fieldDefaults";

export type FieldLibraryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current template fields (so user can save the whole thing, or save a slice). */
  currentFields: TemplateField[];
  onInsert: (fields: TemplateField[]) => void;
};

export function FieldLibraryDialog({
  open,
  onOpenChange,
  currentFields,
  onInsert,
}: FieldLibraryDialogProps) {
  const blocks = useQuery(api.templateBlocks.list, open ? {} : "skip");
  const saveMut = useMutation(api.templateBlocks.save);
  const removeMut = useMutation(api.templateBlocks.remove);
  const [tab, setTab] = useState<"browse" | "save">("browse");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogEyebrow>Reusable blocks</DialogEyebrow>
          <DialogTitle>Field library</DialogTitle>
          <DialogDescription>
            Save a group of fields once, insert them into any template with one
            click.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b flex gap-1 px-4">
          <TabBtn active={tab === "browse"} onClick={() => setTab("browse")}>
            <Library className="size-3.5" />
            Browse
          </TabBtn>
          <TabBtn active={tab === "save"} onClick={() => setTab("save")}>
            <PackagePlus className="size-3.5" />
            Save current
          </TabBtn>
        </div>

        <DialogBody>
          {tab === "browse" ? (
            <BrowseTab
              blocks={blocks ?? null}
              onInsert={(fields) => {
                // Clone ids so inserted fields don't collide with existing ones.
                const rekeyed = fields.map((f) => ({
                  ...f,
                  id: freshFieldId(),
                })) as TemplateField[];
                onInsert(rekeyed);
                onOpenChange(false);
                toast.success("Block inserted");
              }}
              onDelete={(id) =>
                void removeMut({ blockId: id }).then(() =>
                  toast.success("Block deleted"),
                )
              }
            />
          ) : (
            <SaveTab
              currentFields={currentFields}
              onSave={async ({ name, description }) => {
                if (currentFields.length === 0) {
                  toast.error("This template has no fields to save");
                  return;
                }
                await saveMut({
                  name,
                  description: description || undefined,
                  fieldsJson: stringifyTemplateFields(currentFields),
                });
                toast.success(`Saved "${name}" to library`);
                setTab("browse");
              }}
            />
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-foreground border-b-2 border-amber-brand -mb-px"
          : "inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground border-b-2 border-transparent -mb-px hover:text-foreground transition-colors"
      }
    >
      {children}
    </button>
  );
}

function BrowseTab({
  blocks,
  onInsert,
  onDelete,
}: {
  blocks:
    | Array<{
        _id: any;
        name: string;
        description?: string;
        fieldsJson: string;
      }>
    | null;
  onInsert: (fields: TemplateField[]) => void;
  onDelete: (id: any) => void;
}) {
  if (blocks === null) {
    return (
      <p className="text-sm text-muted-foreground py-4">Loading…</p>
    );
  }
  if (blocks.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <Library className="size-5 mx-auto text-muted-foreground/60" />
        <p className="mt-2 text-sm font-medium">No blocks saved yet</p>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
          Build something you like, switch to the "Save current" tab, and give it
          a name. It'll be inserable here from then on.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {blocks.map((b) => {
        let count = 0;
        try {
          count = parseTemplateFields(b.fieldsJson).length;
        } catch {
          /* ignore */
        }
        return (
          <div
            key={b._id}
            className="flex items-start gap-3 rounded-md border bg-background p-3 hover:border-amber-brand/60 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{b.name}</p>
              {b.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {b.description}
                </p>
              )}
              <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                {count} field{count === 1 ? "" : "s"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                try {
                  onInsert(parseTemplateFields(b.fieldsJson));
                } catch {
                  toast.error("This block's data is invalid");
                }
              }}
            >
              <Plus className="size-3.5" />
              Insert
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(b._id)}
              className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function SaveTab({
  currentFields,
  onSave,
}: {
  currentFields: TemplateField[];
  onSave: (v: { name: string; description: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        try {
          await onSave({ name: name.trim(), description: description.trim() });
          setName("");
          setDescription("");
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-3"
    >
      <div className="rounded-sm border bg-muted/30 p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Saving
        </p>
        <p className="text-sm">
          All {currentFields.length} fields in the current template
        </p>
      </div>
      <div>
        <Label className="text-xs">Block name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Site conditions block"
          className="mt-1"
          autoFocus
          required
        />
      </div>
      <div>
        <Label className="text-xs">
          Description
          <span className="text-muted-foreground/60 font-normal normal-case tracking-normal ml-1.5">
            Optional
          </span>
        </Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's it for?"
          rows={2}
          className="mt-1 resize-none"
        />
      </div>
      <Button type="submit" disabled={saving || !name.trim()} className="w-full">
        {saving ? "Saving…" : "Save block"}
      </Button>
    </form>
  );
}
