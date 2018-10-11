import { Indicator, IndicatorInput } from '../indicator/indicator';
import { CandleData } from '../StockData';

export class IchimokuCloudInput extends IndicatorInput {
    high : number[]
    low : number[]
    conversionPeriod:number = 9
    basePeriod:number = 26
    spanPeriod:number = 52
    displacement:number = 26
}

export class IchimokuCloudOutput {
    conversion : number
    base       : number
    spanA      : number
    spanB      : number
}

export class IchimokuCloud extends Indicator{
    result : IchimokuCloudOutput[];
    generator:IterableIterator<IchimokuCloudOutput | undefined>;
	constructor(input:IchimokuCloudInput) {
        super(input);
        this.result = [];
		var defaults = {
			conversionPeriod : 9,
			basePeriod       : 26,
			spanPeriod       : 52,
			displacement     : 26
		}

		var params = (Object as any).assign({}, defaults, input)

		this.generator = (function* () {
			let result:IchimokuCloudOutput
			let tick:CandleData;

			let period = Math.max(params.conversionPeriod,params.basePeriod,params.spanPeriod, params.displacement)
			let periodCounter = 0
			let spanCounter = 0
			let highs = []
			let lows = []
			let spanAs = []
			let spanBs = []

			let conversionPeriodLow, conversionPeriodHigh
			let basePeriodLow, basePeriodHigh
			let spanbPeriodLow, spanbPeriodHigh

			tick = yield
			
			while (true) {
				// Keep a list of lows/highs for the max period
				highs.push(tick.high)
				lows.push(tick.low)

				if(periodCounter < period) {
					periodCounter++
				} else {
					highs.shift()
					lows.shift()

					// Tenkan-sen (ConversionLine): (9-period high + 9-period low)/2))
					conversionPeriodLow = lows.slice(-params.conversionPeriod).reduce( (a,b) => Math.min(a,b) )
					conversionPeriodHigh = highs.slice(-params.conversionPeriod).reduce( (a,b) => Math.max(a,b) )
					let conversionLine = (conversionPeriodHigh + conversionPeriodLow) /2

					// Kijun-sen (Base Line): (26-period high + 26-period low)/2))
					basePeriodLow = lows.slice(-params.basePeriod).reduce( (a,b) => Math.min(a,b) )
					basePeriodHigh = highs.slice(-params.basePeriod).reduce( (a,b) => Math.max(a,b) )
					let baseLine = (basePeriodHigh + basePeriodLow) /2

					// Senkou Span A (Leading Span A): (Conversion Line + Base Line)/2))
					let spanA = 0
					spanAs.push((conversionLine + baseLine) /2)

					// Senkou Span B (Leading Span B): (52-period high + 52-period low)/2))
					let spanB = 0
					spanbPeriodLow = lows.slice(-params.spanPeriod).reduce( (a,b) => Math.min(a,b) )
					spanbPeriodHigh = highs.slice(-params.spanPeriod).reduce( (a,b) => Math.max(a,b) )
					spanBs.push((spanbPeriodHigh + spanbPeriodLow) /2)

					// Senkou Span A / Senkou Span B offset by 26 periods
					if(spanCounter < params.displacement) {
						spanCounter++
					} else {
						spanA = spanAs.shift()
						spanB = spanBs.shift()
					}

					result = {
						conversion : conversionLine,
						base       : baseLine,
						spanA      : spanA,
						spanB      : spanB
                    }
				}

				tick = yield result
			}
        })()
        
        this.generator.next();
        input.low.forEach((tick, index) => {
                var result = this.generator.next({ 
                    high : input.high[index],
                    low : input.low[index],
                });
                if(result.value){
                    this.result.push(result.value)
                }
        });
		
    }
    
    static calculate = ichimokucloud

	nextValue(price:CandleData):IchimokuCloudOutput {
		return this.generator.next(price).value;
	}

}

export function ichimokucloud(input:IchimokuCloudInput):IchimokuCloudOutput[] {
    Indicator.reverseInputs(input);
     var result = new IchimokuCloud(input).result;
     if(input.reversedInput) {
         result.reverse();
     }
     Indicator.reverseInputs(input);
     return result;
 };