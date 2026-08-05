import { useState } from "react";
import { useShop, type ProductReview } from "@/context/shop-context";
import { Star, CheckCircle2, Trash2, Plus, MessageSquare, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReviewSection({
  productSlug,
  productName,
}: {
  productSlug: string;
  productName: string;
}) {
  const { reviews, addReview, deleteReview } = useShop();
  const productReviews = reviews[productSlug] || [];

  const [showForm, setShowForm] = useState(false);
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [image, setImage] = useState("");

  const avgRating =
    productReviews.length > 0
      ? (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1)
      : "5.0";

  const ratingCounts = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: productReviews.filter((r) => r.rating === stars).length,
    percentage:
      productReviews.length > 0
        ? Math.round(
            (productReviews.filter((r) => r.rating === stars).length / productReviews.length) * 100,
          )
        : 0,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !comment.trim()) return;

    addReview(productSlug, {
      author: author.trim(),
      rating,
      comment: comment.trim(),
      image: image.trim() || undefined,
    });

    setAuthor("");
    setComment("");
    setImage("");
    setShowForm(false);
  };

  return (
    <section className="space-y-8 py-8 border-t border-border">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h3 className="font-display text-2xl text-foreground">Customer Reviews & Ratings</h3>
          <p className="text-sm text-muted-foreground mt-1">Verified feedback for {productName}</p>
        </div>

        <Button
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-primary text-primary-foreground font-semibold px-6 shrink-0 self-start md:self-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Write a Review
        </Button>
      </div>

      {/* Ratings Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-3xl border border-border bg-card">
        <div className="flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-border">
          <span className="font-display text-5xl font-bold text-foreground">{avgRating}</span>
          <div className="flex items-center text-amber-500 my-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${i < Math.round(Number(avgRating)) ? "fill-current" : "opacity-30"}`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Based on {productReviews.length} reviews
          </span>
        </div>

        {/* Breakdown Bars */}
        <div className="md:col-span-2 space-y-2 justify-center flex flex-col">
          {ratingCounts.map(({ stars, count, percentage }) => (
            <div key={stars} className="flex items-center gap-3 text-xs">
              <span className="w-12 font-medium text-foreground flex items-center gap-1">
                {stars} <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-10 text-right text-muted-foreground font-mono">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-3xl border border-primary/30 bg-card/90 space-y-4 animate-in fade-in duration-200"
        >
          <h4 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Share Your Experience
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Your Name / Business
              </label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g., Chef Ahmed / Mrs. Khan"
                className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Rating
              </label>
              <div className="flex items-center gap-1 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-6 w-6 ${star <= rating ? "fill-amber-500 text-amber-500" : "text-muted opacity-40"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Review
            </label>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about the freshness, quality, texture, or delivery experience..."
              className="w-full rounded-2xl border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Photo URL (Optional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://..."
                className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full bg-primary text-primary-foreground font-semibold px-6"
            >
              Publish Review
            </Button>
          </div>
        </form>
      )}

      {/* Review List */}
      <div className="space-y-4">
        {productReviews.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No reviews yet for this item. Be the first to leave a review!
          </p>
        ) : (
          productReviews.map((rev) => (
            <div key={rev.id} className="p-5 rounded-2xl border border-border bg-card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{rev.author}</span>
                    {rev.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> Verified Buyer
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{rev.date}</span>
                </div>

                <div className="flex items-center text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < rev.rating ? "fill-current" : "opacity-30"}`}
                    />
                  ))}
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">{rev.comment}</p>

              {rev.image && (
                <div className="mt-2 h-20 w-20 rounded-xl overflow-hidden border border-border">
                  <img
                    src={rev.image}
                    alt="Customer upload"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => deleteReview(productSlug, rev.id)}
                  className="text-[11px] text-muted-foreground hover:text-destructive transition-colors inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
