package app.bedsidefield;

/**
 * Pure helper (JVM-tested: android/test/ScreenInsetsTest.java). The page must stay clear of a camera notch or
 * punch-hole, but padding only the side with the cutout shifts the whole page (camera box, fixation dot, targets)
 * off the middle of the physical screen. So each axis gets the larger of its two insets on both sides.
 */
final class ScreenInsets {
    private ScreenInsets() { }

    /** {left, top, right, bottom} safe insets -> symmetric padding {left, top, right, bottom}. */
    static int[] centred(int[] cutout) {
        int h = Math.max(Math.max(cutout[0], cutout[2]), 0);
        int v = Math.max(Math.max(cutout[1], cutout[3]), 0);
        return new int[] { h, v, h, v };
    }
}
