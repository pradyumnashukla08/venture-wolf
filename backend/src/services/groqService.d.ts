export declare const evaluateStartup: (stage: string, pitchDeckText: string, financialsText: string) => Promise<any>;
export declare const generateAssistText: (fieldLabel: string, context: any, instruction?: string) => Promise<string>;
export declare const analyzeImage: (base64Image: string, documentType: string) => Promise<string>;
export declare const transcribeAndEvaluatePitch: (audioFilePath: string) => Promise<{
    transcript: string;
    evaluation: any;
}>;
//# sourceMappingURL=groqService.d.ts.map