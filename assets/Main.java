package kz.university;

import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import org.apache.commons.math3.stat.descriptive.DescriptiveStatistics;
import org.apache.commons.math3.stat.correlation.PearsonsCorrelation;
import org.apache.commons.math3.stat.regression.SimpleRegression;
import weka.core.Instances;
import weka.core.converters.ConverterUtils.DataSource;
import weka.filters.Filter;
import weka.filters.unsupervised.attribute.Remove;
import weka.classifiers.trees.J48;
import weka.classifiers.Evaluation;
import smile.clustering.KMeans;
import smile.math.MathEx;
import smile.plot.swing.ScatterPlot;
import smile.plot.swing.Canvas;

public class Main {
    public static void main(String[] args) throws Exception {
        System.setOut(new PrintStream(System.out, true, StandardCharsets.UTF_8));
        Locale.setDefault(Locale.US);
        System.setProperty("org.slf4j.simpleLogger.defaultLogLevel", "warn");
        double predictionHours = 3; // 10-нұсқа: 3 сағатқа болжам.
        int k = 3;                 // 10-нұсқа: 3 кластер.
        String file = "data/students.csv";

        // 1. CSV оқу: hours, attendance, labs, score, result.
        List<String> lines = Files.readAllLines(Path.of(file));
        int n = lines.size() - 1;
        double[] hours = new double[n], attendance = new double[n], score = new double[n];
        double[][] points = new double[n][2];
        SimpleRegression regression = new SimpleRegression();
        for (int i = 0; i < n; i++) {
            String[] cells = lines.get(i + 1).split(",");
            hours[i] = Double.parseDouble(cells[0]);
            attendance[i] = Double.parseDouble(cells[1]);
            score[i] = Double.parseDouble(cells[3]);
            regression.addData(hours[i], score[i]);
            points[i] = new double[] {hours[i], score[i]};
        }

        // 2. Commons Math: статистика, корреляция және болжам.
        DescriptiveStatistics stats = new DescriptiveStatistics(score);
        PearsonsCorrelation correlation = new PearsonsCorrelation();
        System.out.printf("10-НҰСҚА. Студент саны: %d%n%n1. COMMONS MATH%n", n);
        System.out.printf("Орташа балл: %.2f%n", stats.getMean());
        System.out.printf("Медиана: %.2f%n", stats.getPercentile(50));
        System.out.printf("Мин / Макс: %.0f / %.0f%n", stats.getMin(), stats.getMax());
        System.out.printf("Стандартты ауытқу: %.2f%n", stats.getStandardDeviation());
        System.out.printf("Корреляция сағат-балл: %.3f%n", correlation.correlation(hours, score));
        System.out.printf("Корреляция қатысу-балл: %.3f%n", correlation.correlation(attendance, score));
        System.out.printf("Формула: балл = %.6f * сағат + %.6f (R^2 = %.6f)%n",
            regression.getSlope(), regression.getIntercept(), regression.getRSquare());
        System.out.printf("%.0f сағатқа болжам: %.2f балл%n",
            predictionHours, regression.predict(predictionHours));

        // 3. Weka: score бағанын алып тастап, result мәнін болжау.
        Instances data = new DataSource(file).getDataSet();
        Remove remove = new Remove();
        remove.setAttributeIndices("4"); // Weka-да баған нөмірлері 1-ден басталады.
        remove.setInputFormat(data);
        data = Filter.useFilter(data, remove);
        data.setClassIndex(data.numAttributes() - 1);
        J48 tree = new J48();
        tree.buildClassifier(data);
        Evaluation evaluation = new Evaluation(data);
        evaluation.crossValidateModel(new J48(), data, 10, new Random(1));
        System.out.println("\n2. WEKA J48\n" + tree);
        System.out.printf("Дәлдік (10-fold CV): %.1f%%%n", evaluation.pctCorrect());
        System.out.println(evaluation.toMatrixString("=== Қателер матрицасы ==="));
        System.out.println("score алынды: қорытынды балл алдын ала болжау кезінде белгісіз болады.");

        // 4. Smile: сағат пен балл бойынша 3 топ және түсті график.
        MathEx.setSeed(42);
        KMeans km = KMeans.fit(points, k);
        String[] names = {"Қолдау қажет", "Орташа нәтиже", "Жоғары нәтиже"};
        System.out.println("\n3. SMILE K-MEANS");
        for (int c = 0; c < k; c++) {
            int rank = 0; // Топ атауын оның орташа балының ретімен таңдаймыз.
            for (double[] center : km.centroids) {
                if (center[1] < km.centroids[c][1]) rank++;
            }
            System.out.printf("Кластер %d — %s: %d студент; орталық: %.2f сағат, %.2f балл.%n",
                c, names[rank], km.size[c], km.centroids[c][0], km.centroids[c][1]);
        }
        Canvas plot = ScatterPlot.of(points, km.y, 'o').canvas();
        plot.setTitle("10-нұсқа: студенттердің 3 кластері");
        plot.setAxisLabels("Аптасына дайындық сағаты", "Балл");
        plot.window();
    }
}
